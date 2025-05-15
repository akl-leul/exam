// app/api/teacher/submissions/[submissionId]/grade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { QuestionType, Prisma } from '@prisma/client'; // Import Prisma for error types

// --- Teacher Authentication Function (Same as above) ---
const TEACHER_AUTH_TOKEN = 'teacher-auth-token';
const TEACHER_ID_COOKIE = 'teacher-id';

async function getAuthenticatedTeacherId(req: NextRequest): Promise<string | null> {
  const authToken = req.cookies.get(TEACHER_AUTH_TOKEN)?.value;
  if (!authToken) { console.error("API Auth (grade submission): Missing auth token."); return null; }
  const teacherId = req.cookies.get(TEACHER_ID_COOKIE)?.value;
  if (!teacherId) { console.error("API Auth (grade submission): Missing teacher ID cookie."); return null; }
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) { console.error(`API Auth (grade submission): Teacher ${teacherId} not found.`); return null; }
  return teacher.id;
}
// --- End Teacher Authentication ---

// Zod schema for the payload of grades
const gradeUpdateSchema = z.object({
  answerId: z.string().cuid("Each grade must have a valid answer ID."),
  pointsAwarded: z.number({
    invalid_type_error: "Points awarded must be a number.",
  }).min(0, "Points cannot be negative.").nullable(), // Allow null if teacher wants to clear points
  // You could add teacherFeedback: z.string().optional().nullable() here if implementing feedback
});

const saveGradesPayloadSchema = z.object({
  grades: z.array(gradeUpdateSchema).min(1, "At least one grade update must be provided."),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const submissionIdFromParams = params.submissionId;
  const logPrefix = `API PUT /api/teacher/submissions/${submissionIdFromParams}/grade:`;
  console.log(`${logPrefix} Request received.`);

  if (!submissionIdFromParams) {
    console.warn(`${logPrefix} submissionId missing from params.`);
    return NextResponse.json({ message: 'Submission ID is required.' }, { status: 400 });
  }

  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      console.warn(`${logPrefix} Unauthorized access attempt.`);
      return NextResponse.json({ message: 'Unauthorized. Please log in as a teacher.' }, { status: 401 });
    }
    console.log(`${logPrefix} Authenticated as teacher: ${teacherId}.`);

    let body;
    try {
        body = await req.json();
        console.log(`${logPrefix} Raw request body:`, body);
    } catch (jsonError: any) {
        console.error(`${logPrefix} Failed to parse request body as JSON:`, jsonError.message);
        return NextResponse.json({ message: "Invalid request: Body must be valid JSON.", detail: jsonError.message }, { status: 400 });
    }

    const validation = saveGradesPayloadSchema.safeParse(body);
    if (!validation.success) {
      console.warn(`${logPrefix} Zod validation failed. Errors:`, validation.error.flatten());
      return NextResponse.json({ 
        message: 'Validation Error: Invalid grade data provided.', 
        errors: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }
    console.log(`${logPrefix} Zod validation successful.`);
    const { grades } = validation.data;

    // Fetch the submission and ensure the teacher is authorized to grade it
    const submission = await prisma.submission.findUnique({
      where: { id: submissionIdFromParams },
      include: {
        exam: { select: { teacherId: true } }, // For authorization
        answers: { include: { question: true } }, // For recalculating total score
      },
    });

    if (!submission) {
      console.warn(`${logPrefix} Submission ${submissionIdFromParams} not found.`);
      return NextResponse.json({ message: 'Submission not found.' }, { status: 404 });
    }
    if (submission.exam.teacherId !== teacherId) {
      console.warn(`${logPrefix} Teacher ${teacherId} not authorized to grade submission ${submissionIdFromParams}.`);
      return NextResponse.json({ message: 'You are not authorized to grade this submission.' }, { status: 403 });
    }
    console.log(`${logPrefix} Authorization successful for grading.`);

    // Start a transaction to update answers and the submission score
    const updatedSubmission = await prisma.$transaction(async (tx) => {
      for (const gradeUpdate of grades) {
        const answerToUpdate = submission.answers.find(ans => ans.id === gradeUpdate.answerId);
        if (!answerToUpdate) {
          console.warn(`${logPrefix} Answer ID ${gradeUpdate.answerId} not found in submission ${submissionIdFromParams}. Skipping.`);
          continue; // Or throw an error if this should not happen
        }

        // Only update points for short answers, or if you allow overriding auto-graded ones
        if (answerToUpdate.question.type === QuestionType.SHORT_ANSWER) {
          await tx.answer.update({
            where: { id: gradeUpdate.answerId },
            data: { 
                pointsAwarded: gradeUpdate.pointsAwarded,
                // isCorrect can be set based on points, e.g., gradeUpdate.pointsAwarded > 0
                isCorrect: gradeUpdate.pointsAwarded !== null && gradeUpdate.pointsAwarded > 0 ? true : (gradeUpdate.pointsAwarded === 0 ? false : null),
            },
          });
          console.log(`${logPrefix} Updated SA Answer ID ${gradeUpdate.answerId} with points: ${gradeUpdate.pointsAwarded}`);
        } 
        // Optional: Allow override for MCQ/TF if needed
        // else if (answerToUpdate.question.type === QuestionType.MCQ || answerToUpdate.question.type === QuestionType.TRUE_FALSE) {
        //   // Logic to update points for auto-graded questions if teacher overrides
        // }
      }

      // Recalculate the total score for the submission
      const allUpdatedAnswers = await tx.answer.findMany({
        where: { submissionId: submissionIdFromParams },
        select: { pointsAwarded: true }
      });

      let newTotalScore = 0;
      let allQuestionsGraded = true;
      for (const ans of allUpdatedAnswers) {
        if (ans.pointsAwarded !== null) {
          newTotalScore += ans.pointsAwarded;
        } else {
          // If any answer still has null pointsAwarded (e.g., an SA not yet graded), it's not fully graded
          const questionForThisAnswer = submission.answers.find(a => a.pointsAwarded === null)?.question;
          if (questionForThisAnswer && questionForThisAnswer.type === QuestionType.SHORT_ANSWER) {
            allQuestionsGraded = false;
          }
        }
      }
      console.log(`${logPrefix} Recalculated total score: ${newTotalScore}. All questions graded: ${allQuestionsGraded}`);

      // Update the submission's score and grading status
      return tx.submission.update({
        where: { id: submissionIdFromParams },
        data: {
          score: newTotalScore,
          isFullyGraded: allQuestionsGraded,
          status: allQuestionsGraded ? "GRADED" : "SUBMITTED", // Update status if fully graded
        },
      });
    });
    console.log(`${logPrefix} Grades saved and submission updated successfully. New score: ${updatedSubmission.score}`);

    return NextResponse.json({ message: 'Grades saved successfully!', submission: updatedSubmission }, { status: 200 });

  } catch (error: any) {
    console.error(`${logPrefix} An unexpected error occurred: ${error.message}`, error);
    let userFriendlyMessage = 'An internal server error occurred while saving grades.';
    let statusCode = 500;
    let errorDetails: string | object = error?.message || "No specific detail.";

    if (error instanceof Prisma.PrismaClientValidationError) {
        userFriendlyMessage = "Database Validation Error: Invalid data format for database operation.";
        errorDetails = error.message; 
        statusCode = 400;
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        userFriendlyMessage = "A database error occurred.";
        errorDetails = `Prisma Error ${error.code}: ${error.message}`;
    }
    
    console.log(`${logPrefix} Responding with status ${statusCode}, message: "${userFriendlyMessage}", detail:`, errorDetails);
    return NextResponse.json({ message: userFriendlyMessage, detail: errorDetails }, { status: statusCode });
  }
}