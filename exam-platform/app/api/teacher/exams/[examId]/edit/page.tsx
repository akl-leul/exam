// app/api/teacher/exams/[examId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { QuestionType as PrismaQuestionType } from '@prisma/client';

const QuestionTypeEnum = PrismaQuestionType; // Alias for clarity

// --- Authentication (keep your existing getAuthenticatedTeacherId) ---
const TEACHER_AUTH_TOKEN = 'teacher-auth-token';
const TEACHER_ID_COOKIE = 'teacher-id';

async function getAuthenticatedTeacherId(req: NextRequest): Promise<string | null> {
  const authToken = req.cookies.get(TEACHER_AUTH_TOKEN)?.value;
  if (!authToken) return null;
  const teacherId = req.cookies.get(TEACHER_ID_COOKIE)?.value;
  if (!teacherId) return null;
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  return teacher ? teacher.id : null;
}
// --- End Authentication ---


const optionSchema = z.object({
  id: z.string().cuid().optional(),       // Real DB ID (if exists)
  tempId: z.string().optional(),     // Frontend temporary ID (if new)
  text: z.string().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  id: z.string().cuid().optional(),       // Real DB ID (if exists)
  tempId: z.string().optional(),     // Frontend temporary ID (if new)
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.nativeEnum(QuestionTypeEnum),
  order: z.number().int(),
  options: z.array(optionSchema).optional(),
});

const updateQuestionsSchema = z.object({
  questions: z.array(questionSchema),
});


export async function PUT(
  req: NextRequest,
  { params: routeParams }: { params: { examId: string } } // Renamed to avoid conflict with examId from body
) {
  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const examIdFromRoute = routeParams.examId; // Use examId from route parameters
    const body = await req.json();

    // console.log("Received payload for update:", JSON.stringify(body, null, 2));

    const validation = updateQuestionsSchema.safeParse(body);
    if (!validation.success) {
      console.error("Zod validation errors:", validation.error.flatten());
      return NextResponse.json({ message: 'Invalid input data', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { questions: updatedQuestionsData } = validation.data;

    const examOwnerCheck = await prisma.exam.findFirst({
      where: { id: examIdFromRoute, teacherId: teacherId },
    });

    if (!examOwnerCheck) {
      return NextResponse.json({ message: 'Exam not found or you are not authorized to edit it.' }, { status: 404 });
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Get current questions for the exam to find out which ones to delete
      const currentDbQuestions = await tx.question.findMany({
        where: { examId: examIdFromRoute },
        select: { id: true, options: { select: { id: true } } } // Also get current option IDs
      });
      
      const currentDbQuestionIds = currentDbQuestions.map(q => q.id);
      // IDs from the submitted payload that are actual DB IDs (not tempIds)
      const payloadExistingQuestionIds = updatedQuestionsData.filter(q => q.id).map(q => q.id as string);

      // 2. Determine questions to delete (present in DB but not in submitted existing IDs)
      const questionIdsToDelete = currentDbQuestionIds.filter(id => !payloadExistingQuestionIds.includes(id));
      if (questionIdsToDelete.length > 0) {
        // Prisma cascades deletes for options due to schema relation, but good to be explicit if not.
        // await tx.option.deleteMany({ where: { questionId: { in: questionIdsToDelete } } }); // if cascade not set
        await tx.question.deleteMany({
          where: { id: { in: questionIdsToDelete }, examId: examIdFromRoute },
        });
        // console.log("Deleted questions:", questionIdsToDelete);
      }
      
      const upsertedQuestionsCollector = [];

      // 3. Upsert questions and their options
      for (const qData of updatedQuestionsData) {
        const questionPayload = {
          text: qData.text,
          type: qData.type,
          order: qData.order,
          examId: examIdFromRoute,
        };

        const upsertedQuestion = await tx.question.upsert({
          where: { id: qData.id || `_nonexistent_id_${Math.random().toString(36).slice(2)}` }, // Use provided ID if exists, else a non-matching ID for create
          create: questionPayload,
          update: { // Only update fields that might change if question exists
            text: qData.text,
            type: qData.type,
            order: qData.order,
          },
          include: { options: true } // Include options for the next step
        });
        // console.log(qData.id ? "Updated question:" : "Created question:", upsertedQuestion.id);

        // Manage options for this question
        if (qData.options && (qData.type === QuestionTypeEnum.MCQ || qData.type === QuestionTypeEnum.TRUE_FALSE)) {
          const currentDbOptionIdsForThisQuestion = upsertedQuestion.options.map(opt => opt.id);
          const payloadExistingOptionIdsForThisQuestion = qData.options.filter(opt => opt.id).map(opt => opt.id as string);

          const optionIdsToDelete = currentDbOptionIdsForThisQuestion.filter(id => !payloadExistingOptionIdsForThisQuestion.includes(id));
          if (optionIdsToDelete.length > 0) {
            await tx.option.deleteMany({
              where: { id: { in: optionIdsToDelete }, questionId: upsertedQuestion.id },
            });
            // console.log("Deleted options for question", upsertedQuestion.id, ":", optionIdsToDelete);
          }

          for (const optData of qData.options) {
            await tx.option.upsert({
              where: { id: optData.id || `_nonexistent_opt_id_${Math.random().toString(36).slice(2)}` },
              create: {
                text: optData.text,
                isCorrect: optData.isCorrect,
                questionId: upsertedQuestion.id,
              },
              update: {
                text: optData.text,
                isCorrect: optData.isCorrect,
              },
            });
          }
        } else if (qData.type === QuestionTypeEnum.SHORT_ANSWER) {
            // If type is SHORT_ANSWER, delete all existing options for this question
            await tx.option.deleteMany({
                where: { questionId: upsertedQuestion.id }
            });
            // console.log("Cleared options for SHORT_ANSWER question:", upsertedQuestion.id);
        }
        upsertedQuestionsCollector.push(upsertedQuestion.id); // Collect IDs for final fetch
      }

      // Return the fully updated exam structure
      return tx.exam.findUnique({
        where: { id: examIdFromRoute },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { id: 'asc'} } }, // Order options for consistency if needed
          },
        },
      });
    });

    // console.log("Transaction successful. Final exam state:", JSON.stringify(transactionResult, null, 2));
    return NextResponse.json({ message: 'Exam updated successfully', exam: transactionResult }, { status: 200 });

  } catch (error: any) {
    console.error('Update Exam Questions API Error:', error);
     if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten().fieldErrors }, { status: 400 });
    }
    // Prisma specific errors can be caught here if needed e.g. error.code === 'P2002' for unique constraints
    return NextResponse.json({ message: error.message || 'Internal server error while updating exam questions' }, { status: 500 });
  }
}