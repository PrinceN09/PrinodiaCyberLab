-- Job Discovery & Career Tracking (v0.4, Phase 1)
-- New: job postings + sources + import audit, skills taxonomy,
-- portfolio repos, certifications, labs/projects, notifications,
-- application tracker extensions (13 statuses, timeline, links).

-- Extend JobStatus with the full application-tracker lifecycle.
-- (Existing values SAVED/APPLIED/INTERVIEW/OFFER/REJECTED are kept;
-- new values are not referenced inside this migration, so adding
-- them in-transaction is safe on PostgreSQL 12+.)
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'DISCOVERED';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'PREPARING';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'READY_TO_APPLY';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'RECRUITER_CONTACT';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'ASSESSMENT';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'FINAL_INTERVIEW';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- CreateEnum
CREATE TYPE "JobSourceType" AS ENUM ('HIRING_CAFE', 'GREENHOUSE', 'LEVER', 'ASHBY', 'SMARTRECRUITERS', 'WORKDAY', 'JOB_BANK_CA', 'EMPLOYER_DIRECT', 'MANUAL');
CREATE TYPE "WorkplaceType" AS ENUM ('REMOTE', 'HYBRID', 'ON_SITE', 'UNKNOWN');
CREATE TYPE "JobEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'COMMISSION', 'UNKNOWN');
CREATE TYPE "SeniorityLevel" AS ENUM ('ENTRY', 'ASSOCIATE', 'INTERMEDIATE', 'SENIOR', 'LEAD', 'UNKNOWN');
CREATE TYPE "SalaryPeriod" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');
CREATE TYPE "ImportRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
CREATE TYPE "SkillProvenance" AS ENUM ('PROFESSIONAL', 'PERSONAL_PROJECT', 'TRAINING_LAB', 'CERTIFICATION', 'DEMONSTRATED', 'FAMILIARITY');
CREATE TYPE "CertificationStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'EARNED', 'EXPIRED');
CREATE TYPE "NotificationType" AS ENUM ('HIGH_MATCH', 'VANCOUVER_JOB', 'REMOTE_CANADA_JOB', 'EXPIRING_SOON', 'DEADLINE_APPROACHING', 'FOLLOW_UP_DUE', 'TRENDING_SKILL', 'PROJECT_MATCH', 'SYSTEM');

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "normalizedCompany" TEXT NOT NULL,
    "duplicateGroupId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "companyLogo" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "responsibilities" TEXT,
    "requiredSkillsText" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSkillsText" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT,
    "workplaceType" "WorkplaceType" NOT NULL DEFAULT 'UNKNOWN',
    "employmentType" "JobEmploymentType" NOT NULL DEFAULT 'UNKNOWN',
    "seniority" "SeniorityLevel" NOT NULL DEFAULT 'UNKNOWN',
    "locationPriority" INTEGER NOT NULL DEFAULT 99,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "salaryPeriod" "SalaryPeriod",
    "acceptsCanadianApplicants" BOOLEAN NOT NULL DEFAULT true,
    "requiresUSResidency" BOOLEAN NOT NULL DEFAULT false,
    "requiresCitizenship" BOOLEAN NOT NULL DEFAULT false,
    "requiresSecurityClearance" BOOLEAN NOT NULL DEFAULT false,
    "visaSponsorship" BOOLEAN,
    "sourcePostedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "matchScore" INTEGER,
    "matchBreakdown" JSONB,
    "matchedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicationUrl" TEXT,
    "primarySourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobPosting_isActive_sourcePostedAt_idx" ON "JobPosting"("isActive", "sourcePostedAt");
CREATE INDEX "JobPosting_normalizedCompany_normalizedTitle_idx" ON "JobPosting"("normalizedCompany", "normalizedTitle");
CREATE INDEX "JobPosting_matchScore_idx" ON "JobPosting"("matchScore");
CREATE INDEX "JobPosting_locationPriority_idx" ON "JobPosting"("locationPriority");

-- CreateTable
CREATE TABLE "JobPostingSource" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "sourceType" "JobSourceType" NOT NULL,
    "sourceJobId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "raw" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPostingSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobPostingSource_sourceType_sourceUrl_key" ON "JobPostingSource"("sourceType", "sourceUrl");
CREATE INDEX "JobPostingSource_jobPostingId_idx" ON "JobPostingSource"("jobPostingId");
ALTER TABLE "JobPostingSource" ADD CONSTRAINT "JobPostingSource_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "JobSourceConfig" (
    "id" TEXT NOT NULL,
    "sourceType" "JobSourceType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "official" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" "ImportRunStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSourceConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobSourceConfig_sourceType_identifier_key" ON "JobSourceConfig"("sourceType", "identifier");

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "sourceType" "JobSourceType" NOT NULL,
    "configId" TEXT,
    "status" "ImportRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "jobsFound" INTEGER NOT NULL DEFAULT 0,
    "jobsCreated" INTEGER NOT NULL DEFAULT 0,
    "jobsUpdated" INTEGER NOT NULL DEFAULT 0,
    "jobsArchived" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "details" JSONB,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportRun_sourceType_startedAt_idx" ON "ImportRun"("sourceType", "startedAt");
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_configId_fkey" FOREIGN KEY ("configId") REFERENCES "JobSourceConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL DEFAULT 'General',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "provenance" "SkillProvenance" NOT NULL DEFAULT 'FAMILIARITY',
    "evidence" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "JobSkillRequirement" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "rawText" TEXT,

    CONSTRAINT "JobSkillRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobSkillRequirement_jobPostingId_skillId_key" ON "JobSkillRequirement"("jobPostingId", "skillId");
ALTER TABLE "JobSkillRequirement" ADD CONSTRAINT "JobSkillRequirement_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobSkillRequirement" ADD CONSTRAINT "JobSkillRequirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PortfolioRepo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "homepage" TEXT,
    "languages" JSONB,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readmeSummary" TEXT,
    "docCompleteness" INTEGER,
    "detectedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includeInMatching" BOOLEAN NOT NULL DEFAULT false,
    "lastPushedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioRepo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortfolioRepo_userId_fullName_key" ON "PortfolioRepo"("userId", "fullName");
ALTER TABLE "PortfolioRepo" ADD CONSTRAINT "PortfolioRepo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "status" "CertificationStatus" NOT NULL DEFAULT 'PLANNED',
    "earnedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "credentialUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Certification" ADD CONSTRAINT "Certification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Lab" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lessonId" TEXT,
    "status" "ModuleStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lab_lessonId_idx" ON "Lab"("lessonId");
ALTER TABLE "Lab" ADD CONSTRAINT "Lab_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lab" ADD CONSTRAINT "Lab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CybersecurityProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "repoUrl" TEXT,
    "artifactUrl" TEXT,
    "status" "ModuleStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CybersecurityProject_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CybersecurityProject" ADD CONSTRAINT "CybersecurityProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LessonSkill" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "LessonSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonSkill_lessonId_skillId_key" ON "LessonSkill"("lessonId", "skillId");
ALTER TABLE "LessonSkill" ADD CONSTRAINT "LessonSkill_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonSkill" ADD CONSTRAINT "LessonSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LabSkill" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "LabSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LabSkill_labId_skillId_key" ON "LabSkill"("labId", "skillId");
ALTER TABLE "LabSkill" ADD CONSTRAINT "LabSkill_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabSkill" ADD CONSTRAINT "LabSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ProjectSkill" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ProjectSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectSkill_projectId_skillId_key" ON "ProjectSkill"("projectId", "skillId");
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CybersecurityProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "jobPostingId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "threshold" INTEGER,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationRule_userId_type_key" ON "NotificationRule"("userId", "type");
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "JobApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobApplicationEvent_applicationId_occurredAt_idx" ON "JobApplicationEvent"("applicationId", "occurredAt");
ALTER TABLE "JobApplicationEvent" ADD CONSTRAINT "JobApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: JobApplication — discovery integration
ALTER TABLE "JobApplication" ADD COLUMN "jobPostingId" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN "resumeId" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN "coverLetterId" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN "recruiter" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN "followUpDate" TIMESTAMP(3);

CREATE INDEX "JobApplication_jobPostingId_idx" ON "JobApplication"("jobPostingId");
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_coverLetterId_fkey" FOREIGN KEY ("coverLetterId") REFERENCES "CoverLetter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
