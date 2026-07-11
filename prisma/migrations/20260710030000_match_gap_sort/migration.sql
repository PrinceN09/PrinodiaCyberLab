-- Phase 5: fewest-missing-skills sorting needs a scalar column
-- (Prisma cannot order by array length server-side).

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN "missingSkillCount" INTEGER;

-- CreateIndex
CREATE INDEX "JobPosting_missingSkillCount_idx" ON "JobPosting"("missingSkillCount");
