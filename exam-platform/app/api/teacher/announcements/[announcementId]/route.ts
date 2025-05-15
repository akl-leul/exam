// app/api/teacher/announcements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedTeacherId } from '@/lib/auth'; // Your auth utility
import { Prisma } from '@prisma/client';

const announcementCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  content: z.string().min(10, "Content must be at least 10 characters long."),
  // expiresAt can be a string (ISO format), optional, and nullable
  expiresAt: z.string().datetime({ offset: true, message: "Invalid ISO 8601 date format for expiresAt." }).optional().nullable(),
  isPublished: z.boolean().optional(), // Frontend might not send this, backend defaults it
});

export async function GET(req: NextRequest) {
  const logPrefix = "API GET /api/teacher/announcements:";
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      console.warn(`${logPrefix} Unauthorized access attempt.`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log(`${logPrefix} Fetching announcements for teacher ID: ${teacherId}`);
    const announcements = await prisma.announcement.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { // Ensure teacher's username is included
        teacher: {
          select: {
            username: true,
          }
        }
      }
    });
    console.log(`${logPrefix} Found ${announcements.length} announcements.`);
    return NextResponse.json({ announcements }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error: ${error.message}`, { stack: error.stack });
    return NextResponse.json({ message: 'Failed to fetch announcements', detail: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
   const teacherId = await getAuthenticatedTeacherId(req); // <--- THIS IS THE CRITICAL LINE
  if (!teacherId) {
    console.warn(`${logPrefix} Unauthorized POST attempt.`);
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 }); // <--- THIS IS THE RESPONSE
  }
  const logPrefix = "API POST /api/teacher/announcements:";
  console.log(`${logPrefix} Request received.`);
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      console.warn(`${logPrefix} Unauthorized POST attempt.`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log(`${logPrefix} Authenticated teacher ID: ${teacherId}`);

    let body;
    try {
      body = await req.json();
    } catch (e: any) {
      console.warn(`${logPrefix} Invalid JSON body: ${e.message}`);
      return NextResponse.json({ message: 'Invalid JSON body', detail: e.message }, { status: 400 });
    }
    console.log(`${logPrefix} Request body:`, body);

    const validation = announcementCreateSchema.safeParse(body);
    if (!validation.success) {
      console.warn(`${logPrefix} Zod validation failed:`, validation.error.flatten().fieldErrors);
      return NextResponse.json({
        message: 'Invalid data provided.',
        errors: validation.error.flatten().fieldErrors
      }, { status: 400 });
    }
    console.log(`${logPrefix} Zod validation successful.`);
    const { title, content, expiresAt, isPublished } = validation.data;

    // Convert expiresAt string to Date object if present
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

    console.log(`${logPrefix} Creating announcement with title: "${title}"`);
    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        content,
        teacherId,
        expiresAt: expiresAtDate,
        isPublished: isPublished ?? true, // Default to true if not provided by client
      },
      // Include teacher details directly in the create response if possible,
      // otherwise, a subsequent fetch is needed as shown below.
      // Prisma's create often doesn't deeply include relations by default.
    });
    console.log(`${logPrefix} Announcement created with ID: ${newAnnouncement.id}`);

    // Fetch the created announcement with the teacher details to match frontend type
    const announcementWithAuthor = await prisma.announcement.findUnique({
        where: { id: newAnnouncement.id },
        include: {
            teacher: {
                select: { username: true }
            }
        }
    });

    if (!announcementWithAuthor) {
        // This case should ideally not happen if creation was successful
        console.error(`${logPrefix} Failed to retrieve created announcement with author details. ID: ${newAnnouncement.id}`);
        return NextResponse.json({ message: 'Announcement created, but failed to retrieve full details.' }, { status: 500 });
    }

    console.log(`${logPrefix} Successfully created and retrieved announcement:`, announcementWithAuthor);
    return NextResponse.json({
      message: 'Announcement created successfully',
      announcement: announcementWithAuthor // Send the one with teacher details
    }, { status: 201 });

  } catch (error: any) {
    console.error(`${logPrefix} CATCH BLOCK ERROR: ${error.message}`, { stack: error.stack, errorObj: error });
    let responseMessage = 'Failed to create announcement.';
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      responseMessage = `Database error occurred (Code: ${error.code}).`;
      // Example: P2002 - Unique constraint failed
      // Example: P2003 - Foreign key constraint failed (e.g., invalid teacherId, though auth should prevent this)
      if (error.code === 'P2003') {
        statusCode = 400; // Bad request due to data integrity
        responseMessage = "Failed due to a data conflict (e.g., related record not found).";
      }
    }
    // Consider also checking for Prisma.PrismaClientValidationError if complex writes are involved

    return NextResponse.json({ message: responseMessage, detail: error.message }, { status: statusCode });
  }
}