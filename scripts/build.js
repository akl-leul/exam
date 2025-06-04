const { execSync } = require("child_process")

try {
  console.log("🔧 Running Prisma generate...")
  execSync("npx prisma generate", { stdio: "inherit" })

  console.log("🏗️ Running Next.js build...")
  execSync("next build", { stdio: "inherit" })

  console.log("✅ Build completed successfully!")
} catch (error) {
  console.error("❌ Build failed:", error)
  process.exit(1)
}
