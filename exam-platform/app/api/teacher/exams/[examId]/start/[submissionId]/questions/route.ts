// app/api/submissions/[submissionId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    const submissionId = params.submissionId;
    if (!submissionId) {
      return NextResponse.json({ message: 'Submission ID is required' }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: {
                  select: { id: true, text: true }, // Only send necessary option data
                },
              },
            },
          },
        },
        studentInfo: true, // To display student name
      },
    });

    if (!submission) {
      return NextResponse.json({ message: 'Submission not found' }, { status: 404 });
    }

    if (submission.status === "SUBMITTED" || submission.status === "GRADED") {
         return NextResponse.json({ message: 'This exam has already been submitted.' }, { status: 403 });
    }

    // Remove correct answer info from options before sending to student
    const questionsForStudent = submission.exam.questions.map(q => ({
      ...q,
      options: q.options.map(opt => ({ id: opt.id, text: opt.text })), // No isCorrect flag
    }));

    return NextResponse.json({
      submissionId: submission.id,
      examTitle: submission.exam.title,
      examHeader: submission.exam.header,
      studentName: submission.studentInfo.name,
      questions: questionsForStudent,
    }, { status: 200 });

  } catch (error) {
    console.error('Get submission questions error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}