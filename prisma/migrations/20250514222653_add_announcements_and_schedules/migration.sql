/*
  Warnings:

  - Added the required column `updatedAt` to the `Announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ScheduledExam` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "teacherId" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Announcement_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Announcement" ("content", "createdAt", "expiresAt", "id", "isPublished", "teacherId", "title") SELECT "content", "createdAt", "expiresAt", "id", "isPublished", "teacherId", "title" FROM "Announcement";
DROP TABLE "Announcement";
ALTER TABLE "new_Announcement" RENAME TO "Announcement";
CREATE TABLE "new_ScheduledExam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examTitle" TEXT NOT NULL,
    "description" TEXT,
    "examDate" DATETIME NOT NULL,
    "duration" TEXT,
    "course" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ScheduledExam_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledExam" ("course", "createdAt", "description", "duration", "examDate", "examTitle", "id", "isPublished", "location", "notes", "teacherId") SELECT "course", "createdAt", "description", "duration", "examDate", "examTitle", "id", "isPublished", "location", "notes", "teacherId" FROM "ScheduledExam";
DROP TABLE "ScheduledExam";
ALTER TABLE "new_ScheduledExam" RENAME TO "ScheduledExam";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
