// app/api/teacher/exams/[examId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers'; // Assuming you use this for auth
import { z } from 'zod';
import { QuestionType as PrismaQuestionType } from '@prisma/client';

const QuestionTypeEnum = PrismaQuestionType;

// --- Authentication (Your existing getAuthenticatedTeacherId) ---
const TEACHER_AUTH_TOKEN = 'teacher-auth-token'; // Example, replace with your actual cookie name
const TEACHER_ID_COOKIE = 'teacher-id'; // Example

async function getAuthenticatedTeacherId(req: NextRequest): Promise<string | null> {
  const authToken = req.cookies.get(TEACHER_AUTH_TOKEN)?.value;
  if (!authToken) {
    console.error("API Auth: Missing auth token cookie");
    return null;
  }
  const teacherId = req.cookies.get(TEACHER_ID_COOKIE)?.value;
  if (!teacherId) {
    console.error("API Auth: Missing teacher ID cookie");
    return null;
  }
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) {
    console.error(`API Auth: Teacher with ID ${teacherId} not found.`);
    return null;
  }
  console.log("API Auth: Authenticated teacher ID:", teacherId);
  return teacher.id;
}
// --- End Authentication ---

const optionSchema = z.object({
  id: z.string().cuid().optional().nullable(), // Allow null if it comes from client like that for new items
  text: z.string().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  id: z.string().cuid().optional().nullable(), // Allow null
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
  { params: routeParams }: { params: { examId: string } }
) {
  const examIdFromRoute = routeParams.examId;
  console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Request received.`);

  try {
    const teacherId = await getAuthenticatedTeacherId(req);
    if (!teacherId) {
      return NextResponse.json({ message: 'Unauthorized: Missing or invalid teacher credentials.' }, { status: 401 });
    }

    const body = await req.json();
    console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Raw request body:`, JSON.stringify(body, null, 2));

    const validation = updateQuestionsSchema.safeParse(body);
    if (!validation.success) {
      console.error(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Zod validation failed. Errors:`, JSON.stringify(validation.error.flatten(), null, 2));
      return NextResponse.json({ message: 'Invalid input data', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Zod validation successful.`);
    
    const { questions: updatedQuestionsData } = validation.data;

    const examOwnerCheck = await prisma.exam.findFirst({
      where: { id: examIdFromRoute, teacherId: teacherId },
    });

    if (!examOwnerCheck) {
      console.warn(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Exam not found or teacher ${teacherId} not authorized.`);
      return NextResponse.json({ message: 'Exam not found or you are not authorized to edit it.' }, { status: 403 }); // 403 Forbidden or 404 Not Found
    }
    console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Exam ownership verified for teacher ${teacherId}.`);

    const transactionResult = await prisma.$transaction(async (tx) => {
      console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Starting Prisma transaction.`);
      
      const currentDbQuestions = await tx.question.findMany({
        where: { examId: examIdFromRoute },
        select: { id: true, options: { select: { id: true } } }
      });
      const currentDbQuestionIds = currentDbQuestions.map(q => q.id);
      const payloadExistingQuestionIds = updatedQuestionsData.filter(q => q.id).map(q => q.id as string);
      
      const questionIdsToDelete = currentDbQuestionIds.filter(id => !payloadExistingQuestionIds.includes(id));
      if (questionIdsToDelete.length > 0) {
        await tx.question.deleteMany({ where: { id: { in: questionIdsToDelete }, examId: examIdFromRoute } });
        console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Deleted questions:`, questionIdsToDelete);
      }
      
      for (const [index, qData] of updatedQuestionsData.entries()) { // Use index for order if not relying on qData.order
        const questionPayload = {
          text: qData.text,
          type: qData.type,
          order: qData.order ?? index, // Use provided order, or fallback to loop index
          examId: examIdFromRoute,
        };

        const upsertedQuestion = await tx.question.upsert({
          where: { id: qData.id || `_ensure_create_${Date.now()}_${Math.random()}` },
          create: questionPayload,
          update: { text: qData.text, type: qData.type, order: qData.order ?? index },
          include: { options: true } // Include for option management below
        });
        console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Upserted question ID ${upsertedQuestion.id} (Original ID from payload: ${qData.id})`);

        if (qData.options && (qData.type === QuestionTypeEnum.MCQ || qData.type === QuestionTypeEnum.TRUE_FALSE)) {
          const currentDbOptionIdsForThisQ = upsertedQuestion.options.map(opt => opt.id);
          const payloadExistingOptionIdsForThisQ = qData.options.filter(opt => opt.id).map(opt => opt.id as string);
          const optionIdsToDelete = currentDbOptionIdsForThisQ.filter(id => !payloadExistingOptionIdsForThisQ.includes(id));

          if (optionIdsToDelete.length > 0) {
            await tx.option.deleteMany({ where: { id: { in: optionIdsToDelete }, questionId: upsertedQuestion.id } });
            console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Deleted options for question ${upsertedQuestion.id}:`, optionIdsToDelete);
          }

          for (const optData of qData.options) {
            await tx.option.upsert({
              where: { id: optData.id || `_ensure_create_opt_${Date.now()}_${Math.random()}` },
              create: { text: optData.text, isCorrect: optData.isCorrect, questionId: upsertedQuestion.id },
              update: { text: optData.text, isCorrect: optData.isCorrect },
            });
          }
        } else if (qData.type === QuestionTypeEnum.SHORT_ANSWER) {
          await tx.option.deleteMany({ where: { questionId: upsertedQuestion.id } });
          console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Cleared options for SHORT_ANSWER question ID ${upsertedQuestion.id}.`);
        }
      }

      console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Fetching final exam state post-transaction.`);
      return tx.exam.findUnique({
        where: { id: examIdFromRoute },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { /* id: 'asc' */ } } }, // Order options if consistent order is important
          },
        },
      });
    });

    console.log(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: Transaction successful. Response:`, JSON.stringify(transactionResult, null, 2));
    return NextResponse.json({ message: 'Exam updated successfully', exam: transactionResult }, { status: 200 });

  } catch (error: any) {
    console.error(`API PUT /api/teacher/exams/${examIdFromRoute}/questions: CATCH BLOCK ERROR:`, error);
    let errorMessage = 'Internal server error while updating exam questions.';
    if (error.message) errorMessage = error.message;
    if (error instanceof z.ZodError) {
        errorMessage = "Validation failed during processing.";
        console.error("ZodError details:", error.flatten());
        return NextResponse.json({ message: errorMessage, errors: error.flatten().fieldErrors }, { status: 400 });
    }
    // Check for Prisma known errors if necessary
    // if (error.code && error.meta) { /* Prisma error handling */ }
    
    return NextResponse.json({ message: errorMessage, detail: error.toString() }, { status: 500 });
  }
}