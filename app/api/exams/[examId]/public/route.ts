import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ examId: string }> }
) {
  const { examId } = await context.params;
  const logPrefix = `API GET /api/exams/${examId}/public:`;
  console.log(`${logPrefix} Request received.`);

  if (!examId) {
    console.warn(`${logPrefix} examId is missing from params.`);
    return NextResponse.json({ message: 'Exam ID is required in the URL path.' }, { status: 400 });
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        header: true,
        instructions: true,
      },
    });

    if (!exam) {
      console.warn(`${logPrefix} Exam with ID ${examId} not found.`);
      return NextResponse.json({ message: `Exam with ID ${examId} not found.` }, { status: 404 });
    }

    console.log(`${logPrefix} Successfully found exam: ${exam.title}`);
    return NextResponse.json({ exam }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`${logPrefix} An unexpected error occurred: ${error.message}`, error);
      return NextResponse.json({ message: 'An internal server error occurred while fetching exam details.' }, { status: 500 });
    }
    console.error(`${logPrefix} An unknown error occurred`, error);
    return NextResponse.json({ message: 'An unknown error occurred.' }, { status: 500 });
  }
}
