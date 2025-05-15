// app/api/teacher/exams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { z } from 'zod';

// WARNING: THIS IS A SIMPLIFIED AUTH CHECK. Use next-auth in production.
const TEACHER_AUTH_TOKEN = 'teacher-auth-token';
const TEACHER_ID_COOKIE = 'teacher-id';

async function getAuthenticatedTeacherId(req: NextRequest): Promise<string | null> {
  const authToken = req.cookies.get(TEACHER_AUTH_TOKEN)?.value;
  if (!authToken) return null; // No token

  // In a real app, you would validate this token against a session store or decode a JWT.
  // For this basic example, we assume if the cookie exists, it's "valid"
  // and we retrieve the teacherId from another cookie.
  const teacherId = req.cookies.get(TEACHER_ID_COOKIE)?.value;
  if (!teacherId) return null;

  // Optionally, verify teacherId exists in DB
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  return teacher ? teacher.id : null;
}


const examSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  instructions: z.string().optional(),
  header: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = examSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { title, instructions, header } = validation.data;

    const exam = await prisma.exam.create({
      data: {
        title,
        instructions,
        header,
        teacherId: teacherId,
      },
    });

    return NextResponse.json({ message: 'Exam created successfully', exam }, { status: 201 });

  } catch (error) {
    console.error('Create exam error:', error);
    // Type guard for Prisma errors or other specific errors if needed
    if (error instanceof Error) {
        return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const exams = await prisma.exam.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ exams }, { status: 200 });

  } catch (error) {
    console.error('Get exams error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}