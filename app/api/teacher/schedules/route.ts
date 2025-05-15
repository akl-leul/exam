import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// You can add a validation schema (e.g., with Zod) for the POST body
import { z } from 'zod';

const scheduleCreateSchema = z.object({
  title: z.string().min(1),
  examDate: z.string().refine(dateStr => !isNaN(Date.parse(dateStr)), {
    message: 'Invalid date format',
  }),
  isPublished: z.boolean().optional(),
  teacherId: z.string().uuid(), // or however you identify teachers
});

export async function GET(req: NextRequest) {
  const logPrefix = "API GET /api/schedules (PUBLIC):";
  try {
    console.log(`${logPrefix} Request received at server time: ${new Date().toISOString()}`);
    const now = new Date();
    console.log(`${logPrefix} Current 'now' for query (UTC): ${now.toISOString()}`);

    const whereClause = {
      isPublished: true,
      examDate: { gt: now }
    };
    console.log(`${logPrefix} Prisma query 'where' clause:`, JSON.stringify(whereClause, null, 2));

    const schedulesFromDb = await prisma.scheduledExam.findMany({
      where: whereClause,
      orderBy: { examDate: 'asc' },
      include: {
        teacher: {
          select: {
            username: true,
          }
        }
      }
    });

    console.log(`${logPrefix} Found ${schedulesFromDb.length} raw schedules from DB.`);
    if (schedulesFromDb.length > 0) {
      console.log(`${logPrefix} First schedule found:`, JSON.stringify(schedulesFromDb[0], (key, value) =>
        key === 'examDate' || key === 'createdAt' || key === 'updatedAt' ? new Date(value).toISOString() : value, 2)
      );
    }

    const schedules = schedulesFromDb.map(schedule => ({
      ...schedule,
      examDate: schedule.examDate.toISOString(),
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    }));

    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error: ${error.message}`, { stack: error.stack, errorDetails: error });
    return NextResponse.json({ message: 'Failed to fetch public schedules', detail: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "API POST /api/schedules:";
  try {
    console.log(`${logPrefix} Request received.`);

    // Parse JSON body
    let body;
    try {
      body = await req.json();
    } catch (e: any) {
      console.warn(`${logPrefix} Invalid JSON body: ${e.message}`);
      return NextResponse.json({ message: 'Invalid JSON body', detail: e.message }, { status: 400 });
    }
    console.log(`${logPrefix} Request body:`, body);

    // Validate input
    const validation = scheduleCreateSchema.safeParse(body);
    if (!validation.success) {
      console.warn(`${logPrefix} Validation failed:`, validation.error.flatten().fieldErrors);
      return NextResponse.json({
        message: 'Invalid data provided.',
        errors: validation.error.flatten().fieldErrors
      }, { status: 400 });
    }
    const { title, examDate, isPublished = true, teacherId } = validation.data;

    // Convert examDate to Date object
    const examDateObj = new Date(examDate);

    // Optional: Authenticate teacher here if you want to verify teacherId matches auth token
    // For now, assume teacherId is valid and trusted

    console.log(`${logPrefix} Creating schedule with title "${title}" for teacherId: ${teacherId}`);

    const newSchedule = await prisma.scheduledExam.create({
      data: {
        title,
        examDate: examDateObj,
        isPublished,
        teacherId,
      },
      include: {
        teacher: {
          select: { username: true }
        }
      }
    });

    console.log(`${logPrefix} Schedule created with ID: ${newSchedule.id}`);

    // Serialize dates
    const scheduleResponse = {
      ...newSchedule,
      examDate: newSchedule.examDate.toISOString(),
      createdAt: newSchedule.createdAt.toISOString(),
      updatedAt: newSchedule.updatedAt.toISOString(),
    };

    return NextResponse.json({
      message: 'Schedule created successfully',
      schedule: scheduleResponse
    }, { status: 201 });

  } catch (error: any) {
    console.error(`${logPrefix} Error: ${error.message}`, { stack: error.stack, errorDetails: error });
    return NextResponse.json({ message: 'Failed to create schedule', detail: error.message }, { status: 500 });
  }
}
