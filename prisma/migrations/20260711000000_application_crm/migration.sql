-- Phase 6: Application Tracker → personal recruitment CRM.
-- Additive & non-destructive: new enums, four new tables
-- (ApplicationInterview / ApplicationAssessment / ApplicationOffer /
-- ApplicationNote), new nullable/defaulted columns on JobApplication
-- and JobApplicationEvent. Existing JobApplication rows are preserved;
-- every added column is nullable or has a default.

-- CreateEnum
CREATE TYPE "ApplicationSource" AS ENUM ('DISCOVERY', 'MANUAL');
CREATE TYPE "InterviewType" AS ENUM ('RECRUITER_SCREEN', 'HR_INTERVIEW', 'HIRING_MANAGER', 'TECHNICAL_INTERVIEW', 'SOC_SCENARIO', 'BEHAVIOURAL', 'PANEL', 'EXECUTIVE', 'FINAL_INTERVIEW', 'OTHER');
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
CREATE TYPE "AssessmentType" AS ENUM ('TECHNICAL_TEST', 'CODING_TEST', 'CYBERSECURITY_LAB', 'SOC_INVESTIGATION', 'TAKE_HOME', 'PERSONALITY', 'COGNITIVE', 'BACKGROUND_CHECK', 'OTHER');
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'PASSED', 'FAILED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "OfferDecision" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'NEGOTIATING');
CREATE TYPE "ApplicationNoteCategory" AS ENUM ('GENERAL', 'RECRUITER', 'INTERVIEW', 'TECHNICAL', 'FOLLOW_UP', 'SALARY', 'COMPANY_RESEARCH');

-- AlterTable: JobApplication (all additive)
ALTER TABLE "JobApplication"
  ADD COLUMN "source" "ApplicationSource" NOT NULL DEFAULT 'DISCOVERY',
  ADD COLUMN "workplaceType" "WorkplaceType",
  ADD COLUMN "employmentType" "JobEmploymentType",
  ADD COLUMN "applicationUrl" TEXT,
  ADD COLUMN "matchScore" INTEGER,
  ADD COLUMN "discoveredAt" TIMESTAMP(3),
  ADD COLUMN "savedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "resumeVersion" TEXT,
  ADD COLUMN "coverLetterVersion" TEXT,
  ADD COLUMN "recruiterName" TEXT,
  ADD COLUMN "recruiterTitle" TEXT,
  ADD COLUMN "recruiterCompany" TEXT,
  ADD COLUMN "recruiterEmail" TEXT,
  ADD COLUMN "recruiterPhone" TEXT,
  ADD COLUMN "hiringManagerName" TEXT,
  ADD COLUMN "hiringManagerEmail" TEXT,
  ADD COLUMN "contactNotes" TEXT,
  ADD COLUMN "followUpReason" TEXT,
  ADD COLUMN "followUpCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "followUpNotes" TEXT,
  ADD COLUMN "reopenedAt" TIMESTAMP(3);

-- Backfill lifecycle timestamps for existing rows.
UPDATE "JobApplication" SET "lastActivityAt" = "updatedAt" WHERE "lastActivityAt" IS NULL;
UPDATE "JobApplication" SET "savedAt" = "createdAt" WHERE "savedAt" IS NULL;

-- AlterTable: JobApplicationEvent (auditable metadata)
ALTER TABLE "JobApplicationEvent"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "metadata" JSONB;

-- CreateTable
CREATE TABLE "ApplicationInterview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL DEFAULT 'OTHER',
    "stage" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "timezone" TEXT,
    "interviewers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locationOrLink" TEXT,
    "prepNotes" TEXT,
    "questionsAsked" TEXT,
    "reflections" TEXT,
    "technicalTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outcome" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAssessment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL DEFAULT 'OTHER',
    "provider" TEXT,
    "receivedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "score" TEXT,
    "result" TEXT,
    "link" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationOffer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3),
    "positionTitle" TEXT,
    "baseSalary" DOUBLE PRECISION,
    "salaryCurrency" TEXT DEFAULT 'CAD',
    "salaryPeriod" TEXT DEFAULT 'YEAR',
    "bonus" TEXT,
    "equity" TEXT,
    "vacationDays" INTEGER,
    "benefitsNotes" TEXT,
    "remotePolicy" TEXT,
    "officeLocation" TEXT,
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "negotiationNotes" TEXT,
    "decision" "OfferDecision" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "ApplicationNoteCategory" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationInterview_applicationId_idx" ON "ApplicationInterview"("applicationId");
CREATE INDEX "ApplicationInterview_userId_idx" ON "ApplicationInterview"("userId");
CREATE INDEX "ApplicationAssessment_applicationId_idx" ON "ApplicationAssessment"("applicationId");
CREATE INDEX "ApplicationAssessment_userId_idx" ON "ApplicationAssessment"("userId");
CREATE UNIQUE INDEX "ApplicationOffer_applicationId_key" ON "ApplicationOffer"("applicationId");
CREATE INDEX "ApplicationOffer_userId_idx" ON "ApplicationOffer"("userId");
CREATE INDEX "ApplicationNote_applicationId_idx" ON "ApplicationNote"("applicationId");
CREATE INDEX "ApplicationNote_userId_idx" ON "ApplicationNote"("userId");
CREATE INDEX "JobApplication_userId_status_idx" ON "JobApplication"("userId", "status");
CREATE INDEX "JobApplication_userId_followUpDate_idx" ON "JobApplication"("userId", "followUpDate");

-- Deduplicate any pre-existing (userId, jobPostingId) collisions before
-- adding the unique index (keeps the most recently updated row active;
-- NULL jobPostingId rows are exempt — Postgres treats NULLs as distinct).
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "userId", "jobPostingId"
           ORDER BY "updatedAt" DESC
         ) AS rn
  FROM "JobApplication"
  WHERE "jobPostingId" IS NOT NULL
)
UPDATE "JobApplication" AS ja
SET "jobPostingId" = NULL
FROM ranked
WHERE ja."id" = ranked."id" AND ranked.rn > 1;

-- CreateIndex (unique)
CREATE UNIQUE INDEX "JobApplication_userId_jobPostingId_key" ON "JobApplication"("userId", "jobPostingId");

-- AddForeignKey
ALTER TABLE "ApplicationInterview" ADD CONSTRAINT "ApplicationInterview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationInterview" ADD CONSTRAINT "ApplicationInterview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationAssessment" ADD CONSTRAINT "ApplicationAssessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationAssessment" ADD CONSTRAINT "ApplicationAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationOffer" ADD CONSTRAINT "ApplicationOffer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationOffer" ADD CONSTRAINT "ApplicationOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
