// app/api/submissions/[submissionId]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { QuestionType } from '@prisma/client';

const studentAnswerSchema = z.object({
  questionId: z.string().cuid("Invalid Question ID in answer."),
  selectedOptionId: z.string().cuid("Invalid Option ID in answer.").optional().nullable(),
  textAnswer: z.string().max(2000, "Short answer too long.").optional().nullable(), // Added max length
});

const submitExamAnswersSchema = z.object({
  answers: z.array(studentAnswerSchema), // Allow empty array if student submits nothing
});

export async function POST(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const submissionIdFromParams = params.submissionId;
  const logPrefix = `API POST /api/submissions/${submissionIdFromParams}/submit:`;
  console.log(`${logPrefix} Request received.`);

  if (!submissionIdFromParams) {
    console.warn(`${logPrefix} submissionId is missing from params.`);
    return NextResponse.json({ message: 'Submission ID is required.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    console.log(`${logPrefix} Raw request body:`, body);

    const validation = submitExamAnswersSchema.safeParse(body);
    if (!validation.success) {
      console.warn(`${logPrefix} Zod validation failed. Errors:`, validation.error.flatten());
      return NextResponse.json({ message: 'Invalid answer data format.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    console.log(`${logPrefix} Zod validation successful.`);
    
    const { answers: studentAnswersPayload } = validation.data;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionIdFromParams },
      include: { 
        exam: { 
          include: { questions: { include: { options: true } } }
        }
      }
    });

    if (!submission) {
      console.warn(`${logPrefix} Submission ${submissionIdFromParams} not found.`);
      return NextResponse.json({ message: 'Exam session not found. Cannot submit answers.' }, { status: 404 });
    }
    if (submission.status === "SUBMITTED" || submission.status === "GRADED") {
      console.warn(`${logPrefix} Submission ${submissionIdFromParams} already processed.`);
      return NextResponse.json({ message: 'This exam has already been submitted or graded.' }, { status: 403 });
    }
    console.log(`${logPrefix} Processing submission for exam: ${submission.exam.title}`);

    let calculatedAutoScore = 0;
    let hasAnyShortAnswerQuestions = false;
    const answerRecordsToCreate = []; // Renamed for clarity

    for (const submittedAns of studentAnswersPayload) {
      const questionInDb = submission.exam.questions.find(q => q.id === submittedAns.questionId);
      if (!questionInDb) {
        console.warn(`${logPrefix} Question ID ${submittedAns.questionId} from payload not found in exam ${submission.examId}. Skipping.`);
        continue;
      }

      let isAnswerCorrect: boolean | null = null;
      let pointsAwardedForThisAnswer: number | null = 0; // Default to 0 points

      if (questionInDb.type === QuestionType.MCQ || questionInDb.type === QuestionType.TRUE_FALSE) {
        if (submittedAns.selectedOptionId) {
          const selectedOptionInDb = questionInDb.options.find(opt => opt.id === submittedAns.selectedOptionId);
          if (selectedOptionInDb && selectedOptionInDb.isCorrect) {
            isAnswerCorrect = true;
            calculatedAutoScore += 1; // Assuming 1 point
            pointsAwardedForThisAnswer = 1;
          } else {
            isAnswerCorrect = false; // Selected option not found or incorrect
          }
        } else {
          isAnswerCorrect = false; // No option selected
        }
      } else if (questionInDb.type === QuestionType.SHORT_ANSWER) {
        hasAnyShortAnswerQuestions = true;
        pointsAwardedForThisAnswer = null; // Requires manual grading
        isAnswerCorrect = null;          // Requires manual grading
      }
      
      answerRecordsToCreate.push({
        questionId: submittedAns.questionId,
        selectedOptionId: submittedAns.selectedOptionId || null,
        textAnswer: submittedAns.textAnswer || null,
        isCorrect: isAnswerCorrect,
        pointsAwarded: pointsAwardedForThisAnswer,
      });
    }
    console.log(`${logPrefix} Auto-graded score: ${calculatedAutoScore}. Has short answers: ${hasAnyShortAnswerQuestions}`);
    
    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({ where: { submissionId: submissionIdFromParams } });
      console.log(`${logPrefix} (Transaction) Cleared old answers for submission ${submissionIdFromParams}.`);

      if (answerRecordsToCreate.length > 0) { // Only create if there are answers
        await tx.answer.createMany({
          data: answerRecordsToCreate.map(ans => ({ ...ans, submissionId: submissionIdFromParams })),
        });
        console.log(`${logPrefix} (Transaction) Created ${answerRecordsToCreate.length} new answer records.`);
      } else {
        console.log(`${logPrefix} (Transaction) No answers provided in payload to create.`);
      }
      
      await tx.submission.update({
        where: { id: submissionIdFromParams },
        data: {
          score: calculatedAutoScore,
          submittedAt: new Date(),
          status: "SUBMITTED",
          isFullyGraded: !hasAnyShortAnswerQuestions,
        },
      });
      console.log(`${logPrefix} (Transaction) Updated submission ${submissionIdFromParams} status and score.`);
    });

    console.log(`${logPrefix} Exam answers submitted and processed successfully.`);
    return NextResponse.json({ 
        message: 'Your answers have been submitted successfully!', 
        submissionId: submissionIdFromParams 
    }, { status: 200 });

  } catch (error: any) {
    console.error(`${logPrefix} An unexpected error occurred: ${error.message}`, error);
    let userFriendlyMessage = 'An internal server error occurred while submitting your answers.';
    if (error.code === 'P2002') { // Prisma unique constraint violation
         userFriendlyMessage = 'There was an issue saving your answers due to a data conflict. Please try refreshing.';
         return NextResponse.json({ message: userFriendlyMessage, detail: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: userFriendlyMessage, detail: error.message || "No specific detail" }, { status: 500 });
  }
}