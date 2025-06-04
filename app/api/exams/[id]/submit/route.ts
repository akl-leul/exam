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

    const { answers } = await request.json()
    const examId = params.id

    // Get the exam attempt
    const examAttempt = await prisma.examAttempt.findUnique({
      where: {
        studentId_examId: {
          studentId: user.id,
          examId: examId,
        },
      },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    })

    if (!examAttempt || examAttempt.isCompleted) {
      return NextResponse.json({ error: "Invalid exam attempt" }, { status: 400 })
    }

    // Calculate score
    let totalScore = 0
    const answerPromises = answers.map(async (answer: any) => {
      const question = examAttempt.exam.questions.find((q) => q.id === answer.questionId)
      if (!question) return

      let isCorrect = false
      if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
        const correctOption = question.options.find((opt) => opt.isCorrect)
        isCorrect = correctOption?.id === answer.selectedOption
      }

      if (isCorrect) {
        totalScore += question.marks
      }

      return prisma.answer.upsert({
        where: {
          studentId_questionId_examAttemptId: {
            studentId: user.id,
            questionId: answer.questionId,
            examAttemptId: examAttempt.id,
          },
        },
        update: {
          selectedOption: answer.selectedOption,
          textAnswer: answer.textAnswer,
        },
        create: {
          studentId: user.id,
          questionId: answer.questionId,
          examAttemptId: examAttempt.id,
          selectedOption: answer.selectedOption,
          textAnswer: answer.textAnswer,
        },
      })
    })

    await Promise.all(answerPromises)

    // Update exam attempt
    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: examAttempt.id },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        score: totalScore,
      },
    })

    return NextResponse.json({
      score: totalScore,
      totalMarks: examAttempt.totalMarks,
      percentage: Math.round((totalScore / examAttempt.totalMarks) * 100),
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
