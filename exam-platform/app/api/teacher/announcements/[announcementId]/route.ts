// app/api/teacher/announcements/[announcementId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedTeacherId } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { announcementId: string } }
) {
  const id = params.announcementId;
  const logPrefix = `API DELETE /api/teacher/announcements/${id}:`;
  console.log(`${logPrefix} Request received.`);
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const announcement = await prisma.announcement.findFirst({
      where: { id, teacherId }
    });
    if (!announcement) return NextResponse.json({ message: 'Announcement not found or not authorized' }, { status: 404 });

    await prisma.announcement.delete({ where: { id } });
    console.log(`${logPrefix} Deleted announcement.`);
    return NextResponse.json({ message: 'Announcement deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error:`, error.message, error.stack);
     let responseMessage = 'Failed to delete announcement';
     let statusCode = 500;
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          responseMessage = 'Announcement not found for deletion.';
          statusCode = 404;
     }
    return NextResponse.json({ message: responseMessage, detail: error.message }, { status: statusCode });
  }
}