// app/api/teacher/exams/[examId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// --- Authentication (Your existing getAuthenticatedTeacherId) ---
const TEACHER_AUTH_TOKEN = 'teacher-auth-token';
const TEACHER_ID_COOKIE = 'teacher-id';

async function getAuthenticatedTeacherId(req: NextRequest): Promise<string | null> {
  const authToken = req.cookies.get(TEACHER_AUTH_TOKEN)?.value;
  if (!authToken) { console.error("API Auth (exam/[id]): Missing auth token."); return null; }
  const teacherId = req.cookies.get(TEACHER_ID_COOKIE)?.value;
  if (!teacherId) { console.error("API Auth (exam/[id]): Missing teacher ID cookie."); return null; }
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) { console.error(`API Auth (exam/[id]): Teacher ${teacherId} not found.`); return null; }
  return teacher.id;
}
// --- End Authentication ---

// GET handler (if you also use this route to fetch single exam details)
export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const examIdFromParams = params.examId;
  const logPrefix = `API GET /api/teacher/exams/${examIdFromParams}:`;
  console.log(`${logPrefix} Request received.`);

  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const exam = await prisma.exam.findFirst({
      where: { 
        id: examIdFromParams,
        teacherId: teacherId // Ensure teacher owns the exam
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: true,
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ message: 'Exam not found or not authorized' }, { status: 404 });
    }
    return NextResponse.json({ exam }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error: ${error.message}`, error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}


// DELETE handler for deleting an exam
export async function DELETE(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const examIdToDelete = params.examId;
  const logPrefix = `API DELETE /api/teacher/exams/${examIdToDelete}:`;
  console.log(`${logPrefix} Request received.`);

  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      console.warn(`${logPrefix} Unauthorized attempt to delete exam.`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log(`${logPrefix} Authenticated as teacher: ${teacherId}.`);

    // First, verify the teacher owns the exam they are trying to delete
    const exam = await prisma.exam.findFirst({
      where: {
        id: examIdToDelete,
        teacherId: teacherId,
      },
    });

    if (!exam) {
      console.warn(`${logPrefix} Exam ${examIdToDelete} not found or teacher ${teacherId} not authorized to delete.`);
      return NextResponse.json({ message: 'Exam not found or you are not authorized to delete this exam.' }, { status: 404 });
    }

    // If exam exists and teacher owns it, proceed with deletion
    // Prisma's onDelete: Cascade on Question model for examId should handle deleting related questions/options.
    // Submissions might need manual consideration if you don't want them deleted or want to archive.
    // For now, assuming submissions might remain or you'll handle their deletion elsewhere if needed.
    // If Submission has a required relation to Exam, cascade delete needs to be set there too, or they need to be unlinked/deleted first.
    // Let's assume questions (and their options) are cascaded.
    // We might need to delete submissions explicitly if they are not set to cascade or set to null on exam delete.

    // For simplicity, let's delete submissions related to this exam first.
    // In a real app, consider what to do with student submission data (archive? soft delete?)
    await prisma.submission.deleteMany({
        where: { examId: examIdToDelete }
    });
    console.log(`${logPrefix} Deleted submissions for exam ${examIdToDelete}.`);

    await prisma.exam.delete({
      where: {
        id: examIdToDelete,
        // Redundant teacherId check here as we already verified ownership, but good for safety
        // teacherId: teacherId 
      },
    });
    console.log(`${logPrefix} Exam ${examIdToDelete} deleted successfully by teacher ${teacherId}.`);

    return NextResponse.json({ message: 'Exam deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error(`${logPrefix} Error deleting exam: ${error.message}`, error);
    // Handle specific Prisma errors if needed (e.g., P2025 Record to delete does not exist)
    if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Exam to delete was not found.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'An internal server error occurred while deleting the exam.' }, { status: 500 });
  }
}