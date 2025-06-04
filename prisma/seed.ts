import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../lib/auth"

const prisma = new PrismaClient()

async function main() {
  // Create admin user if it doesn't exist
  const adminExists = await prisma.user.findUnique({
    where: { email: "teacher@gmail.com" },
  })

  if (!adminExists) {
    const hashedPassword = await hashPassword("password123")
    await prisma.user.create({
      data: {
        email: "teacher@gmail.com",
        name: "Admin Teacher",
        password: hashedPassword,
        role: "ADMIN",
      },
    })
    console.log("Admin user created")
  } else {
    console.log("Admin user already exists")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
