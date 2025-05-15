// app/api/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const logPrefix = "API GET /api/schedules (PUBLIC):";
  try {
    console.log(`${logPrefix} Request received at server time: ${new Date().toISOString()}`);
    const now = new Date();
    console.log(`${logPrefix} Current 'now' for query (UTC): ${now.toISOString()}`);

    const whereClause = {
      isPublished: true,
      examDate: { gt: now } // Only show future exams
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

    return NextResponse.json({ schedules: schedulesFromDb }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error: ${error.message}`, { stack: error.stack, errorDetails: error });
    return NextResponse.json({ message: 'Failed to fetch public schedules', detail: error.message }, { status: 500 });
  }
}