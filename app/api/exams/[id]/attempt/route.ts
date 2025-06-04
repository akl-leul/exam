import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const examId = params.id

    // Check if exam exists and is active
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    })

    if (!exam || !exam.isActive) {
      return NextResponse.json({ error: "Exam not found or inactive" }, { status: 404 })
    }

    // Check if user already attempted this exam
    const existingAttempt = await prisma.examAttempt.findUnique({
      where: {
        studentId_examId: {
          studentId: user.id,
          examId: examId,
        },
      },
    })

    if (existingAttempt) {
      return NextResponse.json({ error: "Exam already attempted" }, { status: 400 })
    }

    // Create new exam attempt
    const examAttempt = await prisma.examAttempt.create({
      data: {
        studentId: user.id,
        examId: examId,
        totalMarks: exam.totalMarks,
      },
    })

    return NextResponse.json(examAttempt)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
