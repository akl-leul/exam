// app/api/teacher/schedules/[scheduleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedTeacherId } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  const id = params.scheduleId;
  const logPrefix = `API DELETE /api/teacher/schedules/${id}:`;
  console.log(`${logPrefix} Request received.`);
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schedule = await prisma.scheduledExam.findFirst({
      where: { id, teacherId }
    });
    if (!schedule) return NextResponse.json({ message: 'Schedule not found or not authorized' }, { status: 404 });

    await prisma.scheduledExam.delete({ where: { id } });
    console.log(`${logPrefix} Deleted schedule.`);
    return NextResponse.json({ message: 'Scheduled exam deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error:`, error.message, error.stack);
    let responseMessage = 'Failed to delete schedule';
    let statusCode = 500;
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          responseMessage = 'Schedule not found for deletion.';
          statusCode = 404;
     }
    return NextResponse.json({ message: responseMessage, detail: error.message }, { status: statusCode });
  }
}