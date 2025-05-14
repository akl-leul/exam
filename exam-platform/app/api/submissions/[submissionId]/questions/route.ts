// app/api/submissions/[submissionId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const submissionIdFromParams = params.submissionId;
  const logPrefix = `API GET /api/submissions/${submissionIdFromParams}/questions:`;
  console.log(`${logPrefix} Request received.`);

  if (!submissionIdFromParams) {
    console.warn(`${logPrefix} submissionId is missing from params.`);
    return NextResponse.json({ message: 'Submission ID is required.' }, { status: 400 });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionIdFromParams },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: { select: { id: true, text: true } }, // Only id and text for student
              },
            },
          },
        },
        studentInfo: { select: { name: true } },
      },
    });

    if (!submission) {
      console.warn(`${logPrefix} Submission ${submissionIdFromParams} not found.`);
      return NextResponse.json({ message: 'Exam session not found. Please start the exam first.' }, { status: 404 });
    }

    if (submission.status === "SUBMITTED" || submission.status === "GRADED") {
      console.warn(`${logPrefix} Submission ${submissionIdFromParams} already submitted/graded.`);
      return NextResponse.json({ 
        message: 'This exam has already been submitted.', 
        redirectToResults: true,
        submissionId: submission.id 
      }, { status: 403 });
    }

    const questionsForStudent = submission.exam.questions.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      order: q.order,
      options: q.options.map(opt => ({ id: opt.id, text: opt.text })),
    }));
    console.log(`${logPrefix} Preparing ${questionsForStudent.length} questions for student.`);

    const responsePayload = {
      submissionId: submission.id,
      examId: submission.examId,
      examTitle: submission.exam.title,
      examHeader: submission.exam.header,
      studentName: submission.studentInfo?.name || 'Student',
      questions: questionsForStudent,
    };
    console.log(`${logPrefix} Successfully sending exam data to student.`);
    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: any) {
    console.error(`${logPrefix} An unexpected error occurred: ${error.message}`, error);
    return NextResponse.json({ message: 'An internal server error occurred while loading exam questions.' }, { status: 500 });
  }
}