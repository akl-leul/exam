// app/api/exams/[examId]/public/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const examId = params.examId;
    if (!examId) {
      return NextResponse.json({ message: 'Exam ID is required' }, { status: 400 });
    }

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
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    return NextResponse.json({ exam }, { status: 200 });
  } catch (error) {
    console.error('Get public exam error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}