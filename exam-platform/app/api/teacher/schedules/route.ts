// app/api/teacher/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedTeacherId } from '@/lib/auth';
import { Prisma } from '@prisma/client';

const scheduledExamCreateSchema = z.object({
  examTitle: z.string().min(3, "Exam title is required."),
  description: z.string().optional().nullable(),
  examDate: z.string().datetime({ offset: true, message: "Valid exam date and time is required." }),
  duration: z.string().optional().nullable(),
  course: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const logPrefix = "API GET /api/teacher/schedules:";
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const schedules = await prisma.scheduledExam.findMany({
      where: { teacherId },
      orderBy: { examDate: 'asc' },
    });
    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error:`, error.message, error.stack);
    return NextResponse.json({ message: 'Failed to fetch schedules', detail: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "API POST /api/teacher/schedules:";
  console.log(`${logPrefix} Request received.`);
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
     console.log(`${logPrefix} Authenticated teacher: ${teacherId}`);

    let body;
    try { body = await req.json(); } 
    catch (e:any) { return NextResponse.json({ message: 'Invalid JSON body', detail: e.message }, { status: 400 }); }
    console.log(`${logPrefix} Request body:`, body);

    const validation = scheduledExamCreateSchema.safeParse(body);
    if (!validation.success) {
      console.warn(`${logPrefix} Zod validation failed:`, validation.error.flatten());
      return NextResponse.json({ message: 'Invalid data for schedule', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    console.log(`${logPrefix} Zod validation successful.`);
    const data = validation.data;

    console.log(`${logPrefix} Creating schedule with title: "${data.examTitle}"`);
    const scheduledExam = await prisma.scheduledExam.create({
      data: {
        ...data,
        examDate: new Date(data.examDate),
        teacherId,
        isPublished: data.isPublished ?? true,
      },
    });
    console.log(`${logPrefix} Schedule created: ID ${scheduledExam.id}`);
    return NextResponse.json({ message: 'Exam scheduled successfully', scheduledExam }, { status: 201 });
  } catch (error: any) {
    console.error(`${logPrefix} CATCH BLOCK ERROR: ${error.message}`, {stack: error.stack, errorObj: error});
    let responseMessage = 'Failed to schedule exam';
    let statusCode = 500;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      responseMessage = `Database error: ${error.code}`;
      if (error.code === 'P2003') statusCode = 400;
    }
    return NextResponse.json({ message: responseMessage, detail: error.message }, { status: statusCode });
  }
}