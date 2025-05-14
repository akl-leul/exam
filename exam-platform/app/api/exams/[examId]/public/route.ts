// app/api/exams/[examId]/public/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const examIdFromParams = params.examId;
  const logPrefix = `API GET /api/exams/${examIdFromParams}/public:`;
  console.log(`${logPrefix} Request received.`);

  if (!examIdFromParams) {
    console.warn(`${logPrefix} examId is missing from params.`);
    return NextResponse.json({ message: 'Exam ID is required in the URL path.' }, { status: 400 });
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examIdFromParams },
      select: {
        id: true,
        title: true,
        header: true,
        instructions: true,
      },
    });

    if (!exam) {
      console.warn(`${logPrefix} Exam with ID ${examIdFromParams} not found.`);
      return NextResponse.json({ message: `Exam with ID ${examIdFromParams} not found.` }, { status: 404 });
    }

    console.log(`${logPrefix} Successfully found exam: ${exam.title}`);
    return NextResponse.json({ exam }, { status: 200 });

  } catch (error: any) {
    console.error(`${logPrefix} An unexpected error occurred: ${error.message}`, error);
    return NextResponse.json({ message: 'An internal server error occurred while fetching exam details.' }, { status: 500 });
  }
}