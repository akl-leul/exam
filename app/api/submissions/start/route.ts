// app/api/submissions/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Adjust the import if your prisma client is elsewhere

export async function POST(req: NextRequest) {
  try {
    const { name, section, grade, examId } = await req.json();

    // Basic validation
    if (!name || !section || !grade || !examId) {
      return NextResponse.json(
        { message: 'All fields are required.', errors: { name: !name ? ['Name required'] : undefined, section: !section ? ['Section required'] : undefined, grade: !grade ? ['Grade required'] : undefined, examId: !examId ? ['Exam ID required'] : undefined } },
        { status: 400 }
      );
    }

    // Find or create student
    let student = await prisma.studentInfo.findFirst({
      where: { name, section, grade },
    });
    if (!student) {
      student = await prisma.studentInfo.create({
        data: { name, section, grade },
      });
    }

    // Check exam exists
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return NextResponse.json({ message: 'Exam not found.' }, { status: 404 });
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        studentInfoId: student.id,
        examId: exam.id,
      },
    });

    return NextResponse.json({ submission: { id: submission.id } }, { status: 201 });
  } catch (err: any) {
    console.error('API /api/submissions/start error:', err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
