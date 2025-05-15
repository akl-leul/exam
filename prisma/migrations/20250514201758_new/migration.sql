/*
  Warnings:

  - A unique constraint covering the columns `[submissionId,questionId]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Answer_selectedOptionId_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "examId" TEXT NOT NULL,
    "studentInfoId" TEXT NOT NULL,
    "submittedAt" DATETIME,
    "score" REAL,
    "isFullyGraded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Submission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Submission_studentInfoId_fkey" FOREIGN KEY ("studentInfoId") REFERENCES "StudentInfo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("examId", "id", "isFullyGraded", "score", "studentInfoId", "submittedAt") SELECT "examId", "id", "isFullyGraded", "score", "studentInfoId", "submittedAt" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Answer_submissionId_questionId_key" ON "Answer"("submissionId", "questionId");
