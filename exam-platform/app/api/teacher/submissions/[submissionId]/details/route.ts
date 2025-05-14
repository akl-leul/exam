// app/api/teacher/submissions/[submissionId]/details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers'; // For auth

// --- Teacher Authentication Function (Ensure this matches your actual implementation) ---
const TEACHER_AUTH_TOKEN = 'teacher-auth-token';
const TEACHER_ID_COOKIE = 'teacher-id';

async function getAuthenticatedTeacherId(req: NextRequest): Promise<string | null> {
  const authToken = req.cookies.get(TEACHER_AUTH_TOKEN)?.value;
  if (!authToken) { console.error("API Auth (submission details): Missing auth token."); return null; }
  const teacherId = req.cookies.get(TEACHER_ID_COOKIE)?.value;
  if (!teacherId) { console.error("API Auth (submission details): Missing teacher ID cookie."); return null; }
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) { console.error(`API Auth (submission details): Teacher ${teacherId} not found.`); return null; }
  return teacher.id;
}
// --- End Teacher Authentication ---

export async function GET(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const submissionIdFromParams = params.submissionId;
  const logPrefix = `API GET /api/teacher/submissions/${submissionIdFromParams}/details:`;
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

    const submission = await prisma.submission.findUnique({
      where: { id: submissionIdFromParams },
      include: {
        studentInfo: true,
        exam: {
          select: { 
            id: true, 
            title: true,
            teacherId: true // Important for authorization check
          }
        },
        answers: {
          orderBy: { question: { order: 'asc' } }, // Order answers by question order
          include: {
            question: { // Include the original question
              include: {
                options: true, // Include ALL options for the question (with isCorrect)
              },
            },
            selectedOption: true, // Include the specific option student selected (if MCQ/TF)
          },
        },
      },
    });

    if (!submission) {
      console.warn(`${logPrefix} Submission ${submissionIdFromParams} not found.`);
      return NextResponse.json({ message: 'Submission not found.' }, { status: 404 });
    }

    // Authorization Check: Does the authenticated teacher own the exam for this submission?
    if (submission.exam.teacherId !== teacherId) {
      console.warn(`${logPrefix} Teacher ${teacherId} is not authorized to view submission ${submissionIdFromParams} (exam owner mismatch).`);
      return NextResponse.json({ message: 'You are not authorized to view this submission.' }, { status: 403 });
    }
    console.log(`${logPrefix} Authorization successful for teacher ${teacherId} to view submission for exam "${submission.exam.title}".`);
    
    // Calculate total possible score for context (simplified)
    // In a real app, each Question might have a 'points' field.
    const questionsInExam = await prisma.question.count({
        where: { examId: submission.examId }
    });
    const totalPossibleScore = questionsInExam; // Assuming 1 point per question

    console.log(`${logPrefix} Successfully fetched submission details.`);
    return NextResponse.json({ submission, totalPossibleScore }, { status: 200 });

  } catch (error: any) {
    console.error(`${logPrefix} An unexpected error occurred: ${error.message}`, error);
    return NextResponse.json({ message: 'An internal server error occurred while fetching submission details.' }, { status: 500 });
  }
}