// app/api/announcements/route.ts (NEW FILE)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const logPrefix = "API GET /api/announcements (PUBLIC):";
  try {
    console.log(`${logPrefix} Fetching all published announcements.`);
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        OR: [ // Only include if not expired OR no expiry date is set
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { // Still include author info
          select: {
            username: true,
          }
        }
      }
    });
    console.log(`${logPrefix} Found ${announcements.length} public announcements.`);
    return NextResponse.json({ announcements }, { status: 200 });
  } catch (error: any) {
    console.error(`${logPrefix} Error: ${error.message}`, { stack: error.stack });
    return NextResponse.json({ message: 'Failed to fetch public announcements', detail: error.message }, { status: 500 });
  }
}