/**
 * Job discovery — provider architecture contracts.
 *
 * Every external source implements JobSourceProvider and returns
 * RawJobInput records. The ingestion pipeline (Phase 3) runs:
 *
 *   provider.fetchJobs() → JobNormalizer → JobEligibilityService
 *     → JobDeduplicationService → persistence → JobMatchingService
 *
 * Providers are replaceable without touching the dashboard or the
 * application tracker. Secrets are read from env vars inside each
 * provider — never passed through or exposed to the frontend.
 */
import type {
  JobEmploymentType,
  JobSourceType,
  SalaryPeriod,
  SeniorityLevel,
  WorkplaceType,
} from "@prisma/client";

/** A job exactly as a provider found it, minimally shaped. */
export type RawJobInput = {
  sourceType: JobSourceType;
  sourceJobId?: string | null;
  sourceUrl: string;
  /** Employer-direct apply link when the source exposes one. */
  applicationUrl?: string | null;

  title: string;
  company: string;
  companyLogo?: string | null;
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  /** Free-text location as the source printed it. */
  location?: string | null;

  /** Structured hints when the source provides them. */
  workplaceTypeHint?: WorkplaceType | null;
  employmentTypeHint?: JobEmploymentType | null;
  seniorityHint?: SeniorityLevel | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriod | null;

  /** Original posting date from the source — never the import date. */
  postedAt?: Date | null;
  expiresAt?: Date | null;

  /** Raw source payload, stored for audit/debugging. */
  raw?: unknown;
};

export type FetchContext = {
  /** Only jobs at/after this instant are of interest (7-day window). */
  since: Date;
  /**
   * Display label from JobSourceConfig — used as the company name by
   * providers whose APIs don't return one (e.g. Lever).
   */
  sourceLabel?: string;
  signal?: AbortSignal;
  log: (message: string) => void;
};

export interface JobSourceProvider {
  readonly sourceType: JobSourceType;
  /** False for reverse-engineered endpoints (HiringCafe, Workday). */
  readonly official: boolean;
  /** Unofficial providers must ship disabled by default. */
  readonly enabledByDefault: boolean;
  /** Human-readable note on access basis and limitations. */
  readonly complianceNote: string;
  /**
   * Fetches recent jobs for one configured identifier (board slug,
   * tenant, feed URL — provider-specific). Must respect ctx.since,
   * apply its own rate limiting, and throw on hard failures so the
   * pipeline can record the ImportRun as FAILED and back off.
   */
  fetchJobs(identifier: string, ctx: FetchContext): Promise<RawJobInput[]>;
}

/** Output of the normalizer — ready for eligibility + persistence. */
export type NormalizedJob = {
  sourceType: JobSourceType;
  sourceJobId: string | null;
  sourceUrl: string;
  applicationUrl: string | null;

  title: string;
  normalizedTitle: string;
  company: string;
  normalizedCompany: string;
  companyLogo: string | null;
  description: string;

  location: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  workplaceType: WorkplaceType;
  employmentType: JobEmploymentType;
  seniority: SeniorityLevel;

  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;

  acceptsCanadianApplicants: boolean;
  requiresUSResidency: boolean;
  requiresCitizenship: boolean;
  requiresSecurityClearance: boolean;

  sourcePostedAt: Date | null;
  expiresAt: Date | null;
  raw: unknown;
};

export type EligibilityVerdict = {
  eligible: boolean;
  /** 1 (Vancouver) … 7 (US remote accepting Canadians); 99 = ineligible. */
  locationPriority: number;
  /** Human-readable reasons for exclusion or priority assignment. */
  reasons: string[];
};
