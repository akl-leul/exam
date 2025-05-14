// app/api/teacher/exams/[examId]/submissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers'; // For auth

// --- Authentication (Your existing getAuthenticatedTeacherId) ---
const TEACHER_AUTH_TOKEN = 'teacher-auth-token';
const TEACHER_ID_COOKIE = 'teacher-id';

async function getAuthenticatedTeacherId(req: NextRequest): Promise<string | null> {
  const authToken = req.cookies.get(TEACHER_AUTH_TOKEN)?.value;
  if (!authToken) return null;
  const teacherId = req.cookies.get(TEACHER_ID_COOKIE)?.value;
  if (!teacherId) return null;
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  return teacher ? teacher.id : null;
}
// --- End Authentication ---

export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const examId = params.examId;
  console.log(`API GET /api/teacher/exams/${examId}/submissions: Request received.`);

  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      console.warn(`API GET /api/teacher/exams/${examId}/submissions: Unauthorized access attempt.`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify the teacher owns this exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        teacherId: teacherId,
      },
      select: { id: true, title: true } // Select only what's needed for the results page header
    });

    if (!exam) {
      console.warn(`API GET /api/teacher/exams/${examId}/submissions: Exam not found or teacher ${teacherId} not authorized.`);
      return NextResponse.json({ message: 'Exam not found or you are not authorized to view its results.' }, { status: 404 });
    }
    console.log(`API GET /api/teacher/exams/${examId}/submissions: Exam ${exam.title} ownership verified for teacher ${teacherId}.`);

    const submissions = await prisma.submission.findMany({
      where: {
        examId: examId,
        // status: { not: "STARTED" } // Optionally filter out submissions that were only started but not submitted
      },
      include: {
        studentInfo: {
          select: {
            name: true,
            section: true,
            grade: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc', // Show most recent submissions first
      },
    });
    console.log(`API GET /api/teacher/exams/${examId}/submissions: Found ${submissions.length} submissions.`);

    return NextResponse.json({ exam, submissions }, { status: 200 });

  } catch (error: any) {
    console.error(`API GET /api/teacher/exams/${examId}/submissions: CATCH BLOCK ERROR:`, error);
    return NextResponse.json({ message: error.message || 'Internal server error while fetching submissions.' }, { status: 500 });
  }
}