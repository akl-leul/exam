// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // --- Seed Teachers ---
  const saltRounds = 10;

  // Teacher 1: Alice
  const hashedPasswordAlice = await bcrypt.hash('passwordAlice123', saltRounds);
  const teacherAlice = await prisma.teacher.upsert({
    where: { username: 'AliceW' }, // Using username as unique constraint for upsert
    update: { passwordHash: hashedPasswordAlice }, // Update password if teacher exists
    create: {
      // id: 'clteacher0000alice', // Optional: provide specific CUID if you want predictable IDs
      username: 'AliceW',
      passwordHash: hashedPasswordAlice, // This field name matches your schema
    },
  });
  console.log(`Created/updated teacher: ${teacherAlice.username} (ID: ${teacherAlice.id})`);

  // Teacher 2: Bob
  const hashedPasswordBob = await bcrypt.hash('passwordBob456', saltRounds);
  const teacherBob = await prisma.teacher.upsert({
    where: { username: 'BobTBuilder' },
    update: { passwordHash: hashedPasswordBob },
    create: {
      // id: 'clteacher0001bob',
      username: 'BobTBuilder',
      passwordHash: hashedPasswordBob,
    },
  });
  console.log(`Created/updated teacher: ${teacherBob.username} (ID: ${teacherBob.id})`);

  // System Teacher (for public/unauthenticated posts if needed)
  const systemTeacherPassword = await bcrypt.hash('SystemP@$$wOrdS3cUr3!VeryLong', saltRounds);
  const systemTeacher = await prisma.teacher.upsert({
    where: { username: 'SystemAdmin' },
    update: { passwordHash: systemTeacherPassword },
    create: {
      id: process.env.SYSTEM_ANNOUNCEMENT_TEACHER_ID || "clsysadmin0000systemteacher", // Use env var or a fixed ID
      username: 'SystemAdmin',
      passwordHash: systemTeacherPassword,
    },
  });
  console.log(`Created/updated system teacher: ${systemTeacher.username} (ID: ${systemTeacher.id})`);


  // --- Seed Announcements ---
  // Using a combination of title and teacherId for a more unique `where` for upsert,
  // or simply use `create` if you don't mind duplicate titles by different teachers.
  // For simplicity here, we'll assume titles are reasonably unique for seeding or just use create.

  await prisma.announcement.create({
    data: {
      title: "Welcome New Intake!",
      content: "A warm welcome to all new students. Orientation is on Monday at 9 AM in the main hall. Please bring your registration slips.",
      teacherId: teacherAlice.id, // Link to Alice
      isPublished: true,
      createdAt: new Date('2024-03-10T10:00:00Z'),
    },
  });
  console.log(`Created announcement: Welcome New Intake!`);

  await prisma.announcement.create({
    data: {
      title: "Midterm Exam Schedule Update",
      content: "The schedule for midterms has been updated. Please check the 'Exam Schedules' tab on the portal. MATH101 is now on Wednesday.",
      teacherId: teacherBob.id, // Link to Bob
      isPublished: true,
      expiresAt: new Date('2024-04-20T23:59:59Z'),
      createdAt: new Date('2024-03-12T14:30:00Z'),
    },
  });
  console.log(`Created announcement: Midterm Exam Schedule Update`);

  await prisma.announcement.create({
    data: {
      title: "Important: Library Hour Changes (Draft)",
      content: "Library hours will be extended during the exam period. This announcement is currently a draft and will be published next week.",
      teacherId: teacherAlice.id,
      isPublished: false, // Draft announcement
      expiresAt: new Date('2024-05-01T00:00:00Z'),
      createdAt: new Date('2024-03-14T09:00:00Z'),
    },
  });
  console.log(`Created announcement: Important: Library Hour Changes (Draft)`);

  await prisma.announcement.create({
    data: {
      title: "Platform Maintenance Notice",
      content: "The exam platform will be temporarily unavailable for scheduled maintenance on Sunday, March 24th, from 2 AM to 4 AM (UTC).",
      teacherId: systemTeacher.id, // Link to SystemAdmin
      isPublished: true,
      createdAt: new Date('2024-03-15T11:00:00Z'),
    },
  });
  console.log(`Created announcement: Platform Maintenance Notice`);


  // --- Seed ScheduledExams ---

  await prisma.scheduledExam.create({
    data: {
      examTitle: "Mathematics 101 - Midterm",
      description: "Covers chapters 1-5. Calculators allowed.",
      examDate: new Date('2024-04-10T09:00:00Z'), // April 10th, 9 AM UTC
      duration: "90 minutes",
      course: "MATH101",
      location: "Room 301, Main Building",
      notes: "Please bring your student ID.",
      teacherId: teacherAlice.id, // Alice is scheduling this
      isPublished: true,
      createdAt: new Date('2024-03-11T10:00:00Z')
    }
  });
  console.log(`Created scheduled exam: Mathematics 101 - Midterm`);

  await prisma.scheduledExam.create({
    data: {
      examTitle: "Physics for Engineers - Final Exam",
      description: "Comprehensive final covering all semester topics. Formula sheet will be provided.",
      examDate: new Date('2024-05-15T13:00:00Z'), // May 15th, 1 PM UTC
      duration: "3 hours",
      course: "PHYS202",
      location: "Examination Hall A",
      teacherId: teacherBob.id, // Bob is scheduling this
      isPublished: true,
      createdAt: new Date('2024-03-13T15:00:00Z')
    }
  });
  console.log(`Created scheduled exam: Physics for Engineers - Final Exam`);

  await prisma.scheduledExam.create({
    data: {
      examTitle: "Introduction to Programming - Practical Test (Draft)",
      description: "Practical test on basic Python programming.",
      examDate: new Date('2024-04-25T14:00:00Z'),
      duration: "2 hours",
      course: "CS100",
      location: "Computer Lab 3",
      notes: "Awaiting final confirmation of lab availability.",
      teacherId: teacherAlice.id,
      isPublished: false, // This is a draft schedule
      createdAt: new Date('2024-03-15T16:00:00Z')
    }
  });
  console.log(`Created scheduled exam: Introduction to Programming - Practical Test (Draft)`);

  // You can add seed data for Exam, Question, Option, StudentInfo, Submission, Answer
  // in a similar fashion if needed, making sure to link them correctly using IDs.
  // For example, to seed an Exam by Alice:
  const sampleExam = await prisma.exam.create({
    data: {
        title: "Basic Algebra Quiz",
        instructions: "Solve all questions. Show your work for partial credit.",
        header: "Algebra - Section A",
        teacherId: teacherAlice.id, // Link to Alice
        // Questions would be seeded separately and linked, or created in a nested write if simple enough
    }
  });
  console.log(`Created sample exam: ${sampleExam.title}`);

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });