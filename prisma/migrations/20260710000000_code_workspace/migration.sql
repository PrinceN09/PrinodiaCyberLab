-- Code Workspace v0.3:
-- 1. CodeFolder table (backfilled from CodeSnippet.folder free-text)
-- 2. CodeSnippet: category, difficulty, folderId (replaces folder string)
-- 3. CodeSnippetVersion (auto-save snapshots)
-- 4. CodeSnippetRelation (links to notes / projects / courses / lessons)

-- CreateEnum
CREATE TYPE "CodeCategory" AS ENUM ('SOC', 'SIEM', 'THREAT_HUNTING', 'INCIDENT_RESPONSE', 'VULNERABILITY_MANAGEMENT', 'GRC', 'PENETRATION_TESTING', 'LINUX', 'NETWORKING', 'CLOUD_SECURITY', 'DETECTION_ENGINEERING');

-- CreateTable
CREATE TABLE "CodeFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeFolder_name_key" ON "CodeFolder"("name");

-- AlterTable: CodeSnippet — new fields
ALTER TABLE "CodeSnippet" ADD COLUMN "category" "CodeCategory";
ALTER TABLE "CodeSnippet" ADD COLUMN "difficulty" "NoteDifficulty";
ALTER TABLE "CodeSnippet" ADD COLUMN "folderId" TEXT;

-- Backfill: create CodeFolder rows from existing free-text folders…
INSERT INTO "CodeFolder" ("id", "name")
SELECT gen_random_uuid()::text, TRIM("folder")
FROM "CodeSnippet"
WHERE "folder" IS NOT NULL AND TRIM("folder") <> ''
GROUP BY TRIM("folder")
ON CONFLICT ("name") DO NOTHING;

-- …and point snippets at them.
UPDATE "CodeSnippet" s
SET "folderId" = f."id"
FROM "CodeFolder" f
WHERE TRIM(s."folder") = f."name";

-- Drop the legacy free-text column.
ALTER TABLE "CodeSnippet" DROP COLUMN "folder";

-- AddForeignKey
ALTER TABLE "CodeSnippet" ADD CONSTRAINT "CodeSnippet_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "CodeFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CodeSnippet_folderId_idx" ON "CodeSnippet"("folderId");
CREATE INDEX "CodeSnippet_category_idx" ON "CodeSnippet"("category");
CREATE INDEX "CodeSnippet_language_idx" ON "CodeSnippet"("language");

-- CreateTable
CREATE TABLE "CodeSnippetVersion" (
    "id" TEXT NOT NULL,
    "snippetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'python',
    "cause" TEXT NOT NULL DEFAULT 'autosave',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSnippetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeSnippetVersion_snippetId_createdAt_idx" ON "CodeSnippetVersion"("snippetId", "createdAt");

-- AddForeignKey
ALTER TABLE "CodeSnippetVersion" ADD CONSTRAINT "CodeSnippetVersion_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "CodeSnippet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CodeSnippetRelation" (
    "id" TEXT NOT NULL,
    "snippetId" TEXT NOT NULL,
    "targetType" "NoteLinkType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSnippetRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeSnippetRelation_snippetId_targetType_targetId_key" ON "CodeSnippetRelation"("snippetId", "targetType", "targetId");
CREATE INDEX "CodeSnippetRelation_snippetId_idx" ON "CodeSnippetRelation"("snippetId");

-- AddForeignKey
ALTER TABLE "CodeSnippetRelation" ADD CONSTRAINT "CodeSnippetRelation_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "CodeSnippet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
