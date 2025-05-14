// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'teacher';
  const password = 'password123'; // Use a strong password in reality
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingTeacher = await prisma.teacher.findUnique({
    where: { username },
  });

  if (!existingTeacher) {
    await prisma.teacher.create({
      data: {
        username: username,
        passwordHash: hashedPassword,
      },
    });
    console.log(`Created teacher: ${username}`);
  } else {
    console.log(`Teacher ${username} already exists.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });