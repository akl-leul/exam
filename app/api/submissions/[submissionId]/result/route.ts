// app/api/submissions/[submissionId]/result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const submissionIdFromParams = params.submissionId;
  const logPrefix = `API GET /api/submissions/${submissionIdFromParams}/result:`;
  console.log(`${logPrefix} Request received.`);

  if (!submissionIdFromParams) {
    console.warn(`${logPrefix} submissionId is missing from params.`);
    return NextResponse.json({ message: 'Submission ID is required.' }, { status: 400 });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionIdFromParams },
      include: {
        studentInfo: true,
        exam: {
          select: { id: true, title: true, header: true }
        },
        answers: {
          include: {
            question: { include: { options: true } }, // ALL options with isCorrect
            selectedOption: true, // Student's selected option object
          },
          orderBy: { question: { order: 'asc' } },
        },
      },
    });

    if (!submission) {
      console.warn(`${logPrefix} Submission ${submissionIdFromParams} not found.`);
      return NextResponse.json({ message: 'Submission results not found.' }, { status: 404 });
    }

    if (submission.status === "STARTED") {
        console.warn(`${logPrefix} Submission ${submissionIdFromParams} not yet submitted.`);
        return NextResponse.json({ 
            message: 'This exam has not been submitted yet. Please complete and submit the exam.',
            redirectToExam: true,
            submissionId: submission.id 
        }, { status: 403 });
    }
    console.log(`${logPrefix} Found submission for exam: ${submission.exam.title}`);

    const questionsInExam = await prisma.question.findMany({ 
        where: { examId: submission.examId },
        // select: { points: true } // Future: if questions have different points
    });
    const totalPossibleScore = questionsInExam.length; // Simplified
    console.log(`${logPrefix} Total possible score for exam ${submission.examId} is ${totalPossibleScore}. Student score: ${submission.score}`);
    
    console.log(`${logPrefix} Successfully sending submission details to student.`);
    return NextResponse.json({ submission, totalPossibleScore }, { status: 200 });

  } catch (error: any) {
    console.error(`${logPrefix} An unexpected error occurred: ${error.message}`, error);
    return NextResponse.json({ message: 'An internal server error occurred while fetching your results.' }, { status: 500 });
  }
}