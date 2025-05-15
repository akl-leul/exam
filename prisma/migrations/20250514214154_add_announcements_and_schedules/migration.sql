/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ScheduledExam` table. All the data in the column will be lost.
  - You are about to alter the column `duration` on the `ScheduledExam` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT NOT NULL,
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
    "duration" INTEGER,
    "course" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT NOT NULL,
    CONSTRAINT "ScheduledExam_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledExam" ("course", "createdAt", "description", "duration", "examDate", "examTitle", "id", "isPublished", "location", "notes", "teacherId") SELECT "course", "createdAt", "description", "duration", "examDate", "examTitle", "id", "isPublished", "location", "notes", "teacherId" FROM "ScheduledExam";
DROP TABLE "ScheduledExam";
ALTER TABLE "new_ScheduledExam" RENAME TO "ScheduledExam";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
