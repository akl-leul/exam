import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [totalExams, totalStudents, totalAttempts] = await Promise.all([
      prisma.exam.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.examAttempt.count(),
    ])

    return NextResponse.json({
      totalExams,
      totalStudents,
      totalAttempts,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
