-- Notes workspace upgrade:
-- 1. NoteRevision → NoteVersion (rename, preserving data)
-- 2. Note: summary, status, difficulty, favorite, categoryId (replaces free-text category)
-- 3. New tables: Category (with backfill from Note.category), Attachment, NoteLink

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NoteDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "NoteLinkType" AS ENUM ('COURSE', 'LESSON', 'PROJECT', 'CODE_SNIPPET', 'DIAGRAM', 'STUDY_SESSION', 'INTERVIEW_QUESTION', 'PORTFOLIO_ITEM', 'REPORT', 'NOTE');

-- Rename NoteRevision → NoteVersion (data preserved)
ALTER TABLE "NoteRevision" RENAME TO "NoteVersion";
ALTER TABLE "NoteVersion" RENAME CONSTRAINT "NoteRevision_pkey" TO "NoteVersion_pkey";
ALTER TABLE "NoteVersion" RENAME CONSTRAINT "NoteRevision_noteId_fkey" TO "NoteVersion_noteId_fkey";
ALTER INDEX "NoteRevision_noteId_createdAt_idx" RENAME TO "NoteVersion_noteId_createdAt_idx";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_noteId_idx" ON "Attachment"("noteId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "NoteLink" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "targetType" "NoteLinkType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoteLink_noteId_targetType_targetId_key" ON "NoteLink"("noteId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "NoteLink_noteId_idx" ON "NoteLink"("noteId");

-- AddForeignKey
ALTER TABLE "NoteLink" ADD CONSTRAINT "NoteLink_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Note — new metadata fields
ALTER TABLE "Note" ADD COLUMN "summary" TEXT;
ALTER TABLE "Note" ADD COLUMN "status" "NoteStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Note" ADD COLUMN "difficulty" "NoteDifficulty";
ALTER TABLE "Note" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "categoryId" TEXT;

-- Backfill: create Category rows from existing free-text categories…
INSERT INTO "Category" ("id", "name")
SELECT gen_random_uuid()::text, TRIM("category")
FROM "Note"
WHERE "category" IS NOT NULL AND TRIM("category") <> ''
GROUP BY TRIM("category")
ON CONFLICT ("name") DO NOTHING;

-- …and point notes at them.
UPDATE "Note" n
SET "categoryId" = c."id"
FROM "Category" c
WHERE TRIM(n."category") = c."name";

-- Drop the legacy free-text column.
ALTER TABLE "Note" DROP COLUMN "category";

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Note_categoryId_idx" ON "Note"("categoryId");

-- CreateIndex
CREATE INDEX "Note_status_idx" ON "Note"("status");
