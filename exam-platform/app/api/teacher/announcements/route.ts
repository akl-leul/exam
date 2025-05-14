// app/api/teacher/announcements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedTeacherId } from '@/lib/auth'; // Your auth utility
import { Prisma } from '@prisma/client';

const announcementCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  content: z.string().min(10, "Content must be at least 10 characters."),
  expiresAt: z.string().datetime({ offset: true, message: "Invalid date format for expiresAt." }).optional().nullable(),
  isPublished: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const logPrefix = "API GET /api/teacher/announcements:";
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const announcements = await prisma.announcement.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ announcements }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error:`, error.message, error.stack);
    return NextResponse.json({ message: 'Failed to fetch announcements', detail: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "API POST /api/teacher/announcements:";
  console.log(`${logPrefix} Request received.`);
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
     console.log(`${logPrefix} Authenticated teacher: ${teacherId}`);

    let body;
    try { body = await req.json(); } 
    catch (e:any) { return NextResponse.json({ message: 'Invalid JSON body', detail: e.message }, { status: 400 }); }
    console.log(`${logPrefix} Request body:`, body);

    const validation = announcementCreateSchema.safeParse(body);
    if (!validation.success) {
      console.warn(`${logPrefix} Zod validation failed:`, validation.error.flatten());
      return NextResponse.json({ message: 'Invalid data', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    console.log(`${logPrefix} Zod validation successful.`);
    const { title, content, expiresAt, isPublished } = validation.data;

    console.log(`${logPrefix} Creating announcement with title: "${title}"`);
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        teacherId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isPublished: isPublished ?? true,
      },
    });
    console.log(`${logPrefix} Announcement created: ID ${announcement.id}`);
    return NextResponse.json({ message: 'Announcement created successfully', announcement }, { status: 201 });
  } catch (error: any) {
    console.error(`${logPrefix} CATCH BLOCK ERROR: ${error.message}`, {stack: error.stack, errorObj: error});
    let responseMessage = 'Failed to create announcement';
    let statusCode = 500;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      responseMessage = `Database error: ${error.code}`;
      if (error.code === 'P2003') statusCode = 400; // Foreign key constraint failed
    }
    return NextResponse.json({ message: responseMessage, detail: error.message }, { status: statusCode });
  }
}