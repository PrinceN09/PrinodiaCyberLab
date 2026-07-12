-- Phase 5 correction: per-user job-search preferences.
-- Defaults mirror DEFAULT_JOB_PREFERENCES (lib/jobs/preferences.ts).

-- CreateTable
CREATE TABLE "JobSearchPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeCity" TEXT NOT NULL DEFAULT 'Vancouver',
    "homeProvince" TEXT NOT NULL DEFAULT 'BC',
    "homeCountry" TEXT NOT NULL DEFAULT 'Canada',
    "willingToRelocate" BOOLEAN NOT NULL DEFAULT true,
    "relocationCountries" TEXT[] DEFAULT ARRAY['Canada']::TEXT[],
    "preferredCountries" TEXT[] DEFAULT ARRAY['Canada']::TEXT[],
    "remoteCanada" BOOLEAN NOT NULL DEFAULT true,
    "remoteUSIfCanadaEligible" BOOLEAN NOT NULL DEFAULT true,
    "hybridCanada" BOOLEAN NOT NULL DEFAULT true,
    "onsiteCanada" BOOLEAN NOT NULL DEFAULT true,
    "employmentTypes" "JobEmploymentType"[] DEFAULT ARRAY['FULL_TIME']::"JobEmploymentType"[],
    "permanentPreferred" BOOLEAN NOT NULL DEFAULT true,
    "maxJobAgeDays" INTEGER NOT NULL DEFAULT 7,
    "minimumMatchScore" INTEGER NOT NULL DEFAULT 0,
    "preferredWorkplaceOrder" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSearchPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobSearchPreference_userId_key" ON "JobSearchPreference"("userId");

-- AddForeignKey
ALTER TABLE "JobSearchPreference" ADD CONSTRAINT "JobSearchPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
