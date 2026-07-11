/**
 * Ingestion pipeline: provider fetch → normalize → eligibility →
 * dedup → persist, with ImportRun audit, failure isolation, dry-run
 * support, and post-run archival.
 *
 * Persistence goes through the IngestionStore interface so the
 * pipeline is testable end-to-end without a database and the store
 * can evolve without touching pipeline logic.
 */
import type { ImportRunStatus, JobSourceType } from "@prisma/client";
import { normalizeJob } from "./normalize";
import { evaluateEligibility, JOB_MAX_AGE_DAYS } from "./eligibility";
import { findDuplicate, type DedupCandidate } from "./dedup";
import { getProvider, isProviderAllowed } from "./registry";
import type { JobSourceProvider, NormalizedJob } from "./types";

// ── Store contract ──────────────────────────────

export type SourceConfigRecord = {
  id: string;
  sourceType: JobSourceType;
  identifier: string;
  label: string;
};

export type PostingWriteFields = {
  normalizedTitle: string;
  normalizedCompany: string;
  title: string;
  company: string;
  companyLogo: string | null;
  description: string;
  location: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  workplaceType: NormalizedJob["workplaceType"];
  employmentType: NormalizedJob["employmentType"];
  seniority: NormalizedJob["seniority"];
  locationPriority: number;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: NormalizedJob["salaryPeriod"];
  acceptsCanadianApplicants: boolean;
  requiresUSResidency: boolean;
  requiresCitizenship: boolean;
  requiresSecurityClearance: boolean;
  sourcePostedAt: Date | null;
  expiresAt: Date | null;
  applicationUrl: string | null;
  primarySourceUrl: string | null;
};

export type SourceWriteFields = {
  sourceType: JobSourceType;
  sourceJobId: string | null;
  sourceUrl: string;
  applicationUrl: string | null;
  raw: unknown;
};

export type DedupRecord = DedupCandidate & { id: string };

export interface IngestionStore {
  listConfigs(filter: {
    sourceType?: JobSourceType;
    identifier?: string;
  }): Promise<SourceConfigRecord[]>;

  startRun(config: SourceConfigRecord): Promise<string>;
  finishRun(
    runId: string,
    patch: {
      status: ImportRunStatus;
      finishedAt: Date;
      jobsFound: number;
      jobsCreated: number;
      jobsUpdated: number;
      jobsArchived: number;
      error?: string | null;
      details?: unknown;
    }
  ): Promise<void>;
  updateConfigStatus(
    configId: string,
    status: ImportRunStatus,
    at: Date
  ): Promise<void>;

  /** Idempotency lookup on the (sourceType, sourceUrl) unique. */
  findSource(
    sourceType: JobSourceType,
    sourceUrl: string
  ): Promise<{ id: string; jobPostingId: string } | null>;
  /** Refresh a re-seen source: lastSeenAt + raw payload. */
  touchSource(sourceId: string, raw: unknown, at: Date): Promise<void>;
  /** Refresh mutable posting fields + lastVerifiedAt. */
  refreshPosting(
    postingId: string,
    fields: PostingWriteFields,
    at: Date
  ): Promise<void>;

  /**
   * Dedup candidates: active postings with this normalizedCompany.
   * `sourceType` lets the store surface the matching source's job id.
   */
  findDedupCandidates(
    normalizedCompany: string,
    sourceType: JobSourceType
  ): Promise<DedupRecord[]>;
  /** Attach an additional source to an existing posting (dedup hit). */
  attachSource(
    postingId: string,
    source: SourceWriteFields,
    at: Date
  ): Promise<void>;
  createPosting(
    fields: PostingWriteFields,
    source: SourceWriteFields,
    at: Date
  ): Promise<string>;

  /** True when any JobApplication links to this posting (saved/applied). */
  hasApplications(postingId: string): Promise<boolean>;
  /** Immediate archival of a posting that turned ineligible. */
  deactivatePosting(postingId: string, at: Date): Promise<void>;

  /**
   * Archives active postings past the age window (or past expiresAt)
   * that have NO linked application (saved/applied jobs are retained).
   * Returns the number of postings archived (or that would be, when
   * counting only).
   */
  archiveExpired(opts: {
    cutoff: Date;
    now: Date;
    countOnly: boolean;
  }): Promise<number>;
}

// ── Summaries ───────────────────────────────────

export type ItemAction = "created" | "updated" | "merged" | "skipped" | "failed";

export type ConfigRunSummary = {
  configId: string;
  sourceType: JobSourceType;
  identifier: string;
  status: ImportRunStatus | "SKIPPED";
  found: number;
  created: number;
  updated: number;
  merged: number;
  skipped: number;
  failed: number;
  /** Existing postings archived mid-run after turning ineligible. */
  deactivated: number;
  skippedReasons: Record<string, number>;
  error?: string;
  log: string[];
};

export type IngestionSummary = {
  startedAt: Date;
  finishedAt: Date;
  dryRun: boolean;
  maxAgeDays: number;
  configs: ConfigRunSummary[];
  archived: number;
};

export type IngestionDeps = {
  store: IngestionStore;
  resolveProvider?: (t: JobSourceType) => JobSourceProvider | null;
  providerAllowed?: (p: JobSourceProvider) => boolean;
  now?: () => Date;
};

export type IngestionOptions = {
  sourceType?: JobSourceType;
  identifier?: string;
  dryRun?: boolean;
  maxAgeDays?: number;
};

// ── Apply-link preference ───────────────────────

/** Employer-direct links beat ATS-hosted; unofficial aggregators last. */
const APPLY_LINK_PRIORITY: Record<string, number> = {
  EMPLOYER_DIRECT: 3,
  GREENHOUSE: 2,
  LEVER: 2,
  ASHBY: 2,
  SMARTRECRUITERS: 2,
  WORKDAY: 2,
  MANUAL: 1,
  JOB_BANK_CA: 0,
  HIRING_CAFE: 0,
};

export function pickPreferredApplyLink(
  sources: { sourceType: string; applicationUrl: string | null }[]
): string | null {
  let best: string | null = null;
  let bestPriority = -1;
  for (const s of sources) {
    if (!s.applicationUrl) continue;
    const p = APPLY_LINK_PRIORITY[s.sourceType] ?? 0;
    if (p > bestPriority) {
      best = s.applicationUrl;
      bestPriority = p;
    }
  }
  return best;
}

// ── Field mapping ───────────────────────────────

function postingFields(
  job: NormalizedJob,
  locationPriority: number
): PostingWriteFields {
  return {
    normalizedTitle: job.normalizedTitle,
    normalizedCompany: job.normalizedCompany,
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo,
    description: job.description,
    location: job.location,
    city: job.city,
    province: job.province,
    country: job.country,
    workplaceType: job.workplaceType,
    employmentType: job.employmentType,
    seniority: job.seniority,
    locationPriority,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    acceptsCanadianApplicants: job.acceptsCanadianApplicants,
    requiresUSResidency: job.requiresUSResidency,
    requiresCitizenship: job.requiresCitizenship,
    requiresSecurityClearance: job.requiresSecurityClearance,
    sourcePostedAt: job.sourcePostedAt,
    expiresAt: job.expiresAt,
    applicationUrl: job.applicationUrl,
    primarySourceUrl: job.sourceUrl,
  };
}

function sourceFields(job: NormalizedJob): SourceWriteFields {
  return {
    sourceType: job.sourceType,
    sourceJobId: job.sourceJobId,
    sourceUrl: job.sourceUrl,
    applicationUrl: job.applicationUrl,
    raw: job.raw,
  };
}

function toDedupCandidate(job: NormalizedJob): DedupCandidate {
  return {
    normalizedCompany: job.normalizedCompany,
    normalizedTitle: job.normalizedTitle,
    city: job.city,
    workplaceType: job.workplaceType,
    applicationUrl: job.applicationUrl,
    sourceJobId: job.sourceJobId,
    description: job.description,
  };
}

// ── Per-item ingestion ──────────────────────────

async function ingestOne(
  job: NormalizedJob,
  store: IngestionStore,
  dryRun: boolean,
  now: Date
): Promise<{ action: ItemAction; reason?: string; deactivated?: boolean }> {
  // Idempotency: seen this exact source before → refresh & verify.
  const existing = await store.findSource(job.sourceType, job.sourceUrl);
  if (existing) {
    const verdict = evaluateEligibility(job, { firstSeenAt: now, now });
    if (!dryRun) {
      await store.touchSource(existing.id, job.raw, now);
      // Refresh always writes current eligibility flags + priority, so
      // a retained-but-ineligible posting is flagged and hidden from
      // discovery (isDiscoverable / DISCOVERABLE_WHERE).
      await store.refreshPosting(
        existing.jobPostingId,
        postingFields(job, verdict.locationPriority),
        now
      );
    }
    if (!verdict.eligible) {
      // The posting turned ineligible (US-only, citizenship,
      // clearance, …). Archive immediately — unless it's saved or
      // applied, in which case it's retained for historical tracking.
      const saved = await store.hasApplications(existing.jobPostingId);
      if (!saved) {
        if (!dryRun) {
          await store.deactivatePosting(existing.jobPostingId, now);
        }
        return {
          action: "updated",
          deactivated: true,
          reason: verdict.reasons[0] ?? "Turned ineligible",
        };
      }
    }
    return { action: "updated" };
  }

  // New source: gate on eligibility (seven-day window uses the
  // original source posting date; firstSeenAt is "now" for new jobs).
  const verdict = evaluateEligibility(job, { firstSeenAt: now, now });
  if (!verdict.eligible) {
    return { action: "skipped", reason: verdict.reasons[0] ?? "Ineligible" };
  }

  // Cross-provider duplicate detection.
  const candidates = await store.findDedupCandidates(
    job.normalizedCompany,
    job.sourceType
  );
  const duplicate = findDuplicate(toDedupCandidate(job), candidates);
  if (duplicate) {
    if (!dryRun) await store.attachSource(duplicate.id, sourceFields(job), now);
    return { action: "merged" };
  }

  if (!dryRun) {
    await store.createPosting(
      postingFields(job, verdict.locationPriority),
      sourceFields(job),
      now
    );
  }
  return { action: "created" };
}

// ── Per-config run ──────────────────────────────

async function runConfig(
  config: SourceConfigRecord,
  provider: JobSourceProvider,
  store: IngestionStore,
  { dryRun, maxAgeDays, now }: { dryRun: boolean; maxAgeDays: number; now: Date }
): Promise<ConfigRunSummary> {
  const summary: ConfigRunSummary = {
    configId: config.id,
    sourceType: config.sourceType,
    identifier: config.identifier,
    status: "RUNNING",
    found: 0,
    created: 0,
    updated: 0,
    merged: 0,
    skipped: 0,
    failed: 0,
    deactivated: 0,
    skippedReasons: {},
    log: [],
  };
  const log = (m: string) => summary.log.push(m);

  const runId = dryRun ? null : await store.startRun(config);
  const since = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

  try {
    const raws = await provider.fetchJobs(config.identifier, {
      since,
      sourceLabel: config.label,
      log,
    });
    summary.found = raws.length;

    for (const raw of raws) {
      try {
        const job = normalizeJob(raw);
        const { action, reason, deactivated } = await ingestOne(
          job,
          store,
          dryRun,
          now
        );
        if (action === "created") summary.created += 1;
        else if (action === "updated") summary.updated += 1;
        else if (action === "merged") summary.merged += 1;
        else summary.skipped += 1;
        if (deactivated) {
          summary.deactivated += 1;
          log(`deactivated (${reason}): ${raw.sourceUrl}`);
        }
        if (reason && !deactivated) {
          summary.skippedReasons[reason] =
            (summary.skippedReasons[reason] ?? 0) + 1;
        }
      } catch (err) {
        summary.failed += 1;
        log(
          `item failed (${raw.sourceUrl}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    summary.status = summary.failed > 0 ? "PARTIAL" : "SUCCESS";
  } catch (err) {
    summary.status = "FAILED";
    summary.error = err instanceof Error ? err.message : String(err);
    log(`provider failed: ${summary.error}`);
  }

  if (!dryRun && runId) {
    await store.finishRun(runId, {
      status: summary.status as ImportRunStatus,
      finishedAt: new Date(),
      jobsFound: summary.found,
      jobsCreated: summary.created,
      jobsUpdated: summary.updated + summary.merged,
      jobsArchived: summary.deactivated,
      error: summary.error ?? null,
      details: { log: summary.log, skippedReasons: summary.skippedReasons },
    });
    await store.updateConfigStatus(
      config.id,
      summary.status as ImportRunStatus,
      now
    );
  }

  return summary;
}

// ── Orchestrator ────────────────────────────────

export async function runIngestion(
  options: IngestionOptions,
  deps: IngestionDeps
): Promise<IngestionSummary> {
  const {
    store,
    resolveProvider = getProvider,
    providerAllowed = isProviderAllowed,
    now: nowFn = () => new Date(),
  } = deps;
  const dryRun = options.dryRun ?? false;
  const maxAgeDays = options.maxAgeDays ?? JOB_MAX_AGE_DAYS;
  const startedAt = nowFn();

  const configs = await store.listConfigs({
    sourceType: options.sourceType,
    identifier: options.identifier,
  });

  const results: ConfigRunSummary[] = [];
  for (const config of configs) {
    const now = nowFn();
    const provider = resolveProvider(config.sourceType);

    // Failure isolation: every branch records a summary and continues.
    if (!provider) {
      const summary = await runConfigUnavailable(
        config,
        "No provider implemented for this source type",
        store,
        dryRun,
        now
      );
      results.push(summary);
      continue;
    }
    if (!providerAllowed(provider)) {
      results.push({
        configId: config.id,
        sourceType: config.sourceType,
        identifier: config.identifier,
        status: "SKIPPED",
        found: 0,
        created: 0,
        updated: 0,
        merged: 0,
        skipped: 0,
        failed: 0,
        deactivated: 0,
        skippedReasons: {},
        log: [
          `${config.sourceType} is unofficial and disabled — see provider complianceNote and env flags`,
        ],
      });
      continue;
    }

    results.push(
      await runConfig(config, provider, store, { dryRun, maxAgeDays, now })
    );
  }

  // Archival pass: unsaved postings past the window (or expired).
  const now = nowFn();
  const cutoff = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);
  const archived = await store.archiveExpired({
    cutoff,
    now,
    countOnly: dryRun,
  });

  return {
    startedAt,
    finishedAt: nowFn(),
    dryRun,
    maxAgeDays,
    configs: results,
    archived,
  };
}

async function runConfigUnavailable(
  config: SourceConfigRecord,
  error: string,
  store: IngestionStore,
  dryRun: boolean,
  now: Date
): Promise<ConfigRunSummary> {
  if (!dryRun) {
    const runId = await store.startRun(config);
    await store.finishRun(runId, {
      status: "FAILED",
      finishedAt: now,
      jobsFound: 0,
      jobsCreated: 0,
      jobsUpdated: 0,
      jobsArchived: 0,
      error,
    });
    await store.updateConfigStatus(config.id, "FAILED", now);
  }
  return {
    configId: config.id,
    sourceType: config.sourceType,
    identifier: config.identifier,
    status: "FAILED",
    found: 0,
    created: 0,
    updated: 0,
    merged: 0,
    skipped: 0,
    failed: 0,
    deactivated: 0,
    skippedReasons: {},
    error,
    log: [error],
  };
}
