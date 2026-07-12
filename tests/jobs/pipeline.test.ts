import { describe, expect, it } from "vitest";
import type { ImportRunStatus, JobSourceType } from "@prisma/client";
import {
  materialFieldsChanged,
  pickPreferredApplyLink,
  runIngestion,
  type DedupRecord,
  type IngestionStore,
  type PostingWriteFields,
  type SourceConfigRecord,
  type SourceWriteFields,
} from "@/lib/jobs/pipeline";
import type { JobSourceProvider, RawJobInput } from "@/lib/jobs/types";
import { isDiscoverable } from "@/lib/jobs/eligibility";

const NOW = new Date("2026-07-10T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

// ── In-memory store (integration tests without a DB) ──

type StoredPosting = PostingWriteFields & {
  id: string;
  firstSeenAt: Date;
  lastVerifiedAt: Date;
  isActive: boolean;
  archivedAt: Date | null;
};
type StoredSource = SourceWriteFields & {
  id: string;
  jobPostingId: string;
  lastSeenAt: Date;
};
type StoredRun = {
  id: string;
  configId: string;
  status: ImportRunStatus;
  finished: boolean;
  jobsFound: number;
  jobsCreated: number;
  jobsUpdated: number;
  error: string | null;
};

class InMemoryStore implements IngestionStore {
  configs: SourceConfigRecord[] = [];
  postings: StoredPosting[] = [];
  sources: StoredSource[] = [];
  runs: StoredRun[] = [];
  /** posting ids that have a linked JobApplication (saved/applied) */
  applications = new Set<string>();
  writes = 0;
  failCreateForTitle: string | null = null;
  private nextId = 1;

  private id(prefix: string) {
    return `${prefix}-${this.nextId++}`;
  }

  async listConfigs(filter: { sourceType?: JobSourceType; identifier?: string }) {
    return this.configs.filter(
      (c) =>
        (!filter.sourceType || c.sourceType === filter.sourceType) &&
        (!filter.identifier || c.identifier === filter.identifier)
    );
  }

  async startRun(config: SourceConfigRecord) {
    this.writes++;
    const run: StoredRun = {
      id: this.id("run"),
      configId: config.id,
      status: "RUNNING",
      finished: false,
      jobsFound: 0,
      jobsCreated: 0,
      jobsUpdated: 0,
      error: null,
    };
    this.runs.push(run);
    return run.id;
  }

  async finishRun(runId: string, patch: Parameters<IngestionStore["finishRun"]>[1]) {
    this.writes++;
    const run = this.runs.find((r) => r.id === runId)!;
    run.status = patch.status;
    run.finished = true;
    run.jobsFound = patch.jobsFound;
    run.jobsCreated = patch.jobsCreated;
    run.jobsUpdated = patch.jobsUpdated;
    run.error = patch.error ?? null;
  }

  async updateConfigStatus() {
    this.writes++;
  }

  async findSource(sourceType: JobSourceType, sourceUrl: string) {
    const s = this.sources.find(
      (x) => x.sourceType === sourceType && x.sourceUrl === sourceUrl
    );
    return s ? { id: s.id, jobPostingId: s.jobPostingId } : null;
  }

  async touchSource(sourceId: string, raw: unknown, at: Date) {
    this.writes++;
    const s = this.sources.find((x) => x.id === sourceId)!;
    s.lastSeenAt = at;
    s.raw = raw;
  }

  async refreshPosting(postingId: string, fields: PostingWriteFields, at: Date) {
    this.writes++;
    const p = this.postings.find((x) => x.id === postingId)!;
    const materialChanged = materialFieldsChanged(p, fields);
    Object.assign(p, fields, { lastVerifiedAt: at });
    return { materialChanged };
  }

  async findDedupCandidates(
    normalizedCompany: string,
    sourceType: JobSourceType
  ): Promise<DedupRecord[]> {
    return this.postings
      .filter((p) => p.isActive && p.normalizedCompany === normalizedCompany)
      .map((p) => ({
        id: p.id,
        normalizedCompany: p.normalizedCompany,
        normalizedTitle: p.normalizedTitle,
        city: p.city,
        workplaceType: p.workplaceType,
        applicationUrl: p.applicationUrl,
        sourceJobId:
          this.sources.find(
            (s) => s.jobPostingId === p.id && s.sourceType === sourceType
          )?.sourceJobId ?? null,
        description: p.description,
      }));
  }

  async attachSource(postingId: string, source: SourceWriteFields, at: Date) {
    this.writes++;
    this.sources.push({
      ...source,
      id: this.id("src"),
      jobPostingId: postingId,
      lastSeenAt: at,
    });
    const p = this.postings.find((x) => x.id === postingId)!;
    p.lastVerifiedAt = at;
    p.applicationUrl = pickPreferredApplyLink(
      this.sources.filter((s) => s.jobPostingId === postingId)
    );
  }

  async createPosting(
    fields: PostingWriteFields,
    source: SourceWriteFields,
    at: Date
  ) {
    if (this.failCreateForTitle && fields.title === this.failCreateForTitle) {
      throw new Error(`simulated write failure for "${fields.title}"`);
    }
    this.writes++;
    const posting: StoredPosting = {
      ...fields,
      id: this.id("post"),
      firstSeenAt: at,
      lastVerifiedAt: at,
      isActive: true,
      archivedAt: null,
    };
    this.postings.push(posting);
    this.sources.push({
      ...source,
      id: this.id("src"),
      jobPostingId: posting.id,
      lastSeenAt: at,
    });
    return posting.id;
  }

  async hasApplications(postingId: string) {
    return this.applications.has(postingId);
  }

  async deactivatePosting(postingId: string, at: Date) {
    this.writes++;
    const p = this.postings.find((x) => x.id === postingId)!;
    p.isActive = false;
    p.archivedAt = at;
  }

  async archiveExpired(opts: { cutoff: Date; now: Date; countOnly: boolean }) {
    const matches = this.postings.filter(
      (p) =>
        p.isActive &&
        !this.applications.has(p.id) &&
        ((p.sourcePostedAt !== null && p.sourcePostedAt < opts.cutoff) ||
          (p.sourcePostedAt === null && p.firstSeenAt < opts.cutoff) ||
          (p.expiresAt !== null && p.expiresAt < opts.now))
    );
    if (!opts.countOnly) {
      this.writes++;
      for (const p of matches) {
        p.isActive = false;
        p.archivedAt = opts.now;
      }
    }
    return matches.length;
  }
}

// ── Fixtures ────────────────────────────────────

function rawJob(over: Partial<RawJobInput> & { sourceType: JobSourceType }): RawJobInput {
  return {
    sourceUrl: `https://example.com/${over.sourceType}/${over.title ?? "job"}`,
    title: "SOC Analyst",
    company: "Acme Security Inc.",
    descriptionText:
      "Full-time permanent SOC role in Vancouver. Monitor Splunk SIEM alerts, " +
      "triage incidents, escalate to Tier 2, and support incident response.",
    location: "Vancouver, BC, Canada",
    postedAt: daysAgo(2),
    ...over,
  };
}

function provider(
  sourceType: JobSourceType,
  jobs: RawJobInput[] | Error
): JobSourceProvider {
  return {
    sourceType,
    official: true,
    enabledByDefault: true,
    complianceNote: "test provider",
    async fetchJobs() {
      if (jobs instanceof Error) throw jobs;
      return jobs;
    },
  };
}

function config(
  sourceType: JobSourceType,
  identifier: string
): SourceConfigRecord {
  return { id: `cfg-${sourceType}-${identifier}`, sourceType, identifier, label: identifier };
}

function deps(
  store: InMemoryStore,
  providers: Partial<Record<JobSourceType, JobSourceProvider>>,
  allowed = true
) {
  return {
    store,
    resolveProvider: (t: JobSourceType) => providers[t] ?? null,
    providerAllowed: () => allowed,
    now: () => NOW,
  };
}

// ── Tests ───────────────────────────────────────

describe("ingestion pipeline", () => {
  it("creates postings and sources, and records a SUCCESS run", async () => {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "acme")];
    const summary = await runIngestion(
      {},
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({ sourceType: "GREENHOUSE", sourceJobId: "1" }),
          rawJob({
            sourceType: "GREENHOUSE",
            sourceJobId: "2",
            title: "GRC Analyst",
            sourceUrl: "https://example.com/gh/grc",
            descriptionText:
              "Full-time GRC role. ISO 27001 audits, SOC 2 evidence, risk register.",
          }),
        ]),
      })
    );

    expect(summary.configs[0].status).toBe("SUCCESS");
    expect(summary.configs[0].created).toBe(2);
    expect(store.postings).toHaveLength(2);
    expect(store.sources).toHaveLength(2);
    expect(store.runs[0].finished).toBe(true);
    expect(store.runs[0].jobsCreated).toBe(2);
    expect(store.postings[0].locationPriority).toBe(3); // Vancouver on-site
    expect(store.postings[0].sourcePostedAt).toEqual(daysAgo(2));
    // New postings are flagged for match scoring.
    expect(summary.changedPostingIds).toHaveLength(2);
  });

  it("is idempotent: re-running updates timestamps without duplicating", async () => {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "acme")];
    const jobs = [rawJob({ sourceType: "GREENHOUSE", sourceJobId: "1" })];
    const d = deps(store, { GREENHOUSE: provider("GREENHOUSE", jobs) });

    await runIngestion({}, d);
    const before = store.postings[0].lastVerifiedAt;
    const secondNow = new Date(NOW.getTime() + 60_000);
    const summary = await runIngestion(
      {},
      { ...d, now: () => secondNow }
    );

    expect(summary.configs[0].created).toBe(0);
    expect(summary.configs[0].updated).toBe(1);
    expect(store.postings).toHaveLength(1);
    expect(store.sources).toHaveLength(1);
    expect(store.postings[0].lastVerifiedAt.getTime()).toBeGreaterThan(
      before.getTime()
    );
    expect(store.sources[0].lastSeenAt).toEqual(secondNow);
    // Timestamp-only refresh: no material change → no rescoring.
    expect(summary.changedPostingIds).toHaveLength(0);
  });

  it("flags materially changed postings for rescoring, ignoring metadata-only refreshes", async () => {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "acme")];
    const url = "https://g/1";
    const first = await runIngestion(
      {},
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({ sourceType: "GREENHOUSE", sourceUrl: url }),
        ]),
      })
    );
    expect(first.changedPostingIds).toHaveLength(1);

    // Same content again → timestamp-only refresh.
    const second = await runIngestion(
      {},
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({ sourceType: "GREENHOUSE", sourceUrl: url }),
        ]),
      })
    );
    expect(second.changedPostingIds).toHaveLength(0);

    // Description edited → material change → rescoring flagged.
    const third = await runIngestion(
      {},
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({
            sourceType: "GREENHOUSE",
            sourceUrl: url,
            descriptionText:
              "Full-time permanent SOC role in Vancouver. Now with Microsoft Sentinel and KQL detection engineering.",
          }),
        ]),
      })
    );
    expect(third.changedPostingIds).toEqual([store.postings[0].id]);
  });

  it("deduplicates the same vacancy across providers (one posting, two sources)", async () => {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "acme"), config("LEVER", "acme")];
    const summary = await runIngestion(
      {},
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({
            sourceType: "GREENHOUSE",
            sourceUrl: "https://boards.greenhouse.io/acme/1",
            applicationUrl: "https://boards.greenhouse.io/acme/1",
          }),
        ]),
        LEVER: provider("LEVER", [
          rawJob({
            sourceType: "LEVER",
            sourceUrl: "https://jobs.lever.co/acme/xyz",
            applicationUrl: "https://jobs.lever.co/acme/xyz/apply",
            company: "Acme Security", // slug-ish naming variance
          }),
        ]),
      })
    );

    const gh = summary.configs.find((c) => c.sourceType === "GREENHOUSE")!;
    const lever = summary.configs.find((c) => c.sourceType === "LEVER")!;
    expect(gh.created).toBe(1);
    expect(lever.merged).toBe(1);
    expect(store.postings).toHaveLength(1);
    expect(store.sources).toHaveLength(2);
    expect(store.postings[0].applicationUrl).toBeTruthy();
  });

  it("skips ineligible jobs with recorded reasons", async () => {
    const store = new InMemoryStore();
    store.configs = [config("LEVER", "acme")];
    const summary = await runIngestion(
      {},
      deps(store, {
        LEVER: provider("LEVER", [
          rawJob({
            sourceType: "LEVER",
            sourceUrl: "https://l/1",
            descriptionText:
              "Remote (US only). Applicants must reside in the United States.",
            location: "Remote",
          }),
          rawJob({
            sourceType: "LEVER",
            sourceUrl: "https://l/2",
            title: "Security Intern",
            employmentTypeHint: "INTERNSHIP",
          }),
          rawJob({
            sourceType: "LEVER",
            sourceUrl: "https://l/3",
            postedAt: daysAgo(10), // stale
          }),
        ]),
      })
    );

    expect(summary.configs[0].created).toBe(0);
    expect(summary.configs[0].skipped).toBe(3);
    expect(store.postings).toHaveLength(0);
    const reasons = Object.keys(summary.configs[0].skippedReasons).join(" | ");
    expect(reasons).toMatch(/US residency/);
    expect(reasons).toMatch(/Internship/);
    expect(reasons).toMatch(/Older than 7 days/);
  });

  it("isolates provider failures: one FAILED source doesn't stop others", async () => {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "broken"), config("LEVER", "acme")];
    const summary = await runIngestion(
      {},
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", new Error("HTTP 503 for board")),
        LEVER: provider("LEVER", [
          rawJob({ sourceType: "LEVER", sourceUrl: "https://l/ok" }),
        ]),
      })
    );

    const gh = summary.configs.find((c) => c.sourceType === "GREENHOUSE")!;
    const lever = summary.configs.find((c) => c.sourceType === "LEVER")!;
    expect(gh.status).toBe("FAILED");
    expect(gh.error).toContain("503");
    expect(lever.status).toBe("SUCCESS");
    expect(store.postings).toHaveLength(1);
    // Both runs recorded and finished (audit trail intact).
    expect(store.runs).toHaveLength(2);
    expect(store.runs.every((r) => r.finished)).toBe(true);
  });

  it("marks a run PARTIAL when individual items fail", async () => {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "acme")];
    store.failCreateForTitle = "GRC Analyst";
    const summary = await runIngestion(
      {},
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({ sourceType: "GREENHOUSE", sourceUrl: "https://g/1" }),
          rawJob({
            sourceType: "GREENHOUSE",
            sourceUrl: "https://g/2",
            title: "GRC Analyst",
            descriptionText: "Full-time GRC role. ISO 27001, SOC 2, risk.",
          }),
        ]),
      })
    );

    expect(summary.configs[0].status).toBe("PARTIAL");
    expect(summary.configs[0].created).toBe(1);
    expect(summary.configs[0].failed).toBe(1);
    expect(store.postings).toHaveLength(1);
  });

  it("dry-run performs no writes and reports would-be actions", async () => {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "acme")];
    const summary = await runIngestion(
      { dryRun: true },
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({ sourceType: "GREENHOUSE", sourceUrl: "https://g/1" }),
        ]),
      })
    );

    expect(summary.dryRun).toBe(true);
    expect(summary.configs[0].created).toBe(1); // reported…
    expect(store.postings).toHaveLength(0); // …but nothing written
    expect(store.runs).toHaveLength(0);
    expect(store.writes).toBe(0);
  });

  it("archives expired unsaved postings but retains saved/applied ones", async () => {
    const store = new InMemoryStore();
    store.configs = [];
    // Pre-seed: two stale postings, one with an application.
    await store.createPosting(
      stalePostingFields("old-unsaved"),
      staleSourceFields("https://g/old1"),
      daysAgo(10)
    );
    const keptId = await store.createPosting(
      stalePostingFields("old-saved"),
      staleSourceFields("https://g/old2"),
      daysAgo(10)
    );
    store.applications.add(keptId);
    // Manually age the sourcePostedAt (createPosting set firstSeenAt).
    for (const p of store.postings) p.sourcePostedAt = daysAgo(10);

    const summary = await runIngestion({}, deps(store, {}));

    expect(summary.archived).toBe(1);
    const unsaved = store.postings.find((p) => p.title === "old-unsaved")!;
    const saved = store.postings.find((p) => p.title === "old-saved")!;
    expect(unsaved.isActive).toBe(false);
    expect(unsaved.archivedAt).toEqual(NOW);
    expect(saved.isActive).toBe(true);
  });

  it("skips disallowed unofficial providers without failing the run", async () => {
    const store = new InMemoryStore();
    store.configs = [config("HIRING_CAFE", "feed")];
    const summary = await runIngestion(
      {},
      deps(
        store,
        { HIRING_CAFE: provider("HIRING_CAFE", [rawJob({ sourceType: "HIRING_CAFE" })]) },
        false // providerAllowed → false
      )
    );

    expect(summary.configs[0].status).toBe("SKIPPED");
    expect(store.postings).toHaveLength(0);
    expect(store.runs).toHaveLength(0);
  });

  it("records FAILED for configs whose source has no provider", async () => {
    const store = new InMemoryStore();
    store.configs = [config("ASHBY", "acme")];
    const summary = await runIngestion({}, deps(store, {}));
    expect(summary.configs[0].status).toBe("FAILED");
    expect(summary.configs[0].error).toMatch(/No provider/);
    expect(store.runs).toHaveLength(1);
    expect(store.runs[0].status).toBe("FAILED");
  });
});

describe("postings that turn ineligible on refresh", () => {
  /**
   * Runs ingestion twice against the same sourceUrl: first with an
   * eligible Canadian description, then with `secondDescription`.
   */
  async function refreshScenario(
    secondDescription: string,
    { saved = false }: { saved?: boolean } = {}
  ) {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "acme")];
    const url = "https://boards.greenhouse.io/acme/jobs/1";

    const firstJobs = [
      rawJob({ sourceType: "GREENHOUSE", sourceUrl: url, sourceJobId: "1" }),
    ];
    await runIngestion(
      {},
      deps(store, { GREENHOUSE: provider("GREENHOUSE", firstJobs) })
    );
    expect(store.postings).toHaveLength(1);
    expect(store.postings[0].isActive).toBe(true);
    if (saved) store.applications.add(store.postings[0].id);

    const secondJobs = [
      rawJob({
        sourceType: "GREENHOUSE",
        sourceUrl: url,
        sourceJobId: "1",
        descriptionText: secondDescription,
        postedAt: daysAgo(2),
      }),
    ];
    const summary = await runIngestion(
      {},
      deps(store, { GREENHOUSE: provider("GREENHOUSE", secondJobs) })
    );
    return { store, summary, posting: store.postings[0] };
  }

  it("archives an eligible Canada job that becomes US-only (unsaved)", async () => {
    const { summary, posting } = await refreshScenario(
      "Full-time SOC role. Remote (US only). Applicants must reside in the United States."
    );
    expect(summary.configs[0].deactivated).toBe(1);
    expect(posting.isActive).toBe(false);
    expect(posting.archivedAt).toEqual(NOW);
    expect(posting.requiresUSResidency).toBe(true);
    expect(isDiscoverable(posting)).toBe(false);
  });

  it("archives a job that gains a US citizenship requirement (unsaved)", async () => {
    const { summary, posting } = await refreshScenario(
      "Full-time SOC role in Vancouver. US citizenship required for this position."
    );
    expect(summary.configs[0].deactivated).toBe(1);
    expect(posting.isActive).toBe(false);
    expect(posting.requiresCitizenship).toBe(true);
    expect(isDiscoverable(posting)).toBe(false);
  });

  it("archives a job that gains an incompatible clearance requirement (unsaved)", async () => {
    const { summary, posting } = await refreshScenario(
      "Full-time SOC role in Vancouver. Active TS/SCI clearance required."
    );
    expect(summary.configs[0].deactivated).toBe(1);
    expect(posting.isActive).toBe(false);
    expect(posting.requiresSecurityClearance).toBe(true);
    expect(isDiscoverable(posting)).toBe(false);
  });

  it("retains saved/applied ineligible jobs but hides them from discovery", async () => {
    const { summary, posting } = await refreshScenario(
      "Full-time SOC role. Remote (US only). Applicants must reside in the United States.",
      { saved: true }
    );
    // Retained for historical tracking…
    expect(summary.configs[0].deactivated).toBe(0);
    expect(posting.isActive).toBe(true);
    expect(posting.archivedAt).toBeNull();
    // …but flagged ineligible and invisible to active discovery.
    expect(posting.requiresUSResidency).toBe(true);
    expect(posting.locationPriority).toBe(99);
    expect(isDiscoverable(posting)).toBe(false);
  });

  it("keeps eligible refreshes active and discoverable (control)", async () => {
    const { summary, posting } = await refreshScenario(
      "Full-time permanent SOC role in Vancouver. Monitor Splunk SIEM alerts."
    );
    expect(summary.configs[0].deactivated).toBe(0);
    expect(posting.isActive).toBe(true);
    expect(isDiscoverable(posting)).toBe(true);
  });

  it("dry-run reports the would-be deactivation without writing", async () => {
    const store = new InMemoryStore();
    store.configs = [config("GREENHOUSE", "acme")];
    const url = "https://g/1";
    await runIngestion(
      {},
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({ sourceType: "GREENHOUSE", sourceUrl: url }),
        ]),
      })
    );
    const writesBefore = store.writes;

    const summary = await runIngestion(
      { dryRun: true },
      deps(store, {
        GREENHOUSE: provider("GREENHOUSE", [
          rawJob({
            sourceType: "GREENHOUSE",
            sourceUrl: url,
            descriptionText: "Remote (US only). Must reside in the United States.",
          }),
        ]),
      })
    );

    expect(summary.configs[0].deactivated).toBe(1);
    expect(store.writes).toBe(writesBefore); // nothing written
    expect(store.postings[0].isActive).toBe(true); // unchanged
  });
});

describe("apply-link preference", () => {
  it("prefers employer-direct over ATS over aggregator", () => {
    expect(
      pickPreferredApplyLink([
        { sourceType: "HIRING_CAFE", applicationUrl: "https://hc/apply" },
        { sourceType: "GREENHOUSE", applicationUrl: "https://gh/apply" },
        { sourceType: "EMPLOYER_DIRECT", applicationUrl: "https://acme/apply" },
      ])
    ).toBe("https://acme/apply");
  });

  it("falls back through nulls", () => {
    expect(
      pickPreferredApplyLink([
        { sourceType: "EMPLOYER_DIRECT", applicationUrl: null },
        { sourceType: "LEVER", applicationUrl: "https://lever/apply" },
      ])
    ).toBe("https://lever/apply");
    expect(pickPreferredApplyLink([])).toBeNull();
  });
});

// ── helpers for archival test ───────────────────

function stalePostingFields(title: string): PostingWriteFields {
  return {
    normalizedTitle: title,
    normalizedCompany: "acme security",
    title,
    company: "Acme Security",
    companyLogo: null,
    description: "old role",
    location: "Vancouver, BC",
    city: "Vancouver",
    province: "BC",
    country: "Canada",
    workplaceType: "ON_SITE",
    employmentType: "FULL_TIME",
    seniority: "ENTRY",
    locationPriority: 1,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    acceptsCanadianApplicants: true,
    requiresUSResidency: false,
    requiresCitizenship: false,
    requiresSecurityClearance: false,
    sourcePostedAt: daysAgo(10),
    expiresAt: null,
    applicationUrl: null,
    primarySourceUrl: null,
  };
}

function staleSourceFields(url: string): SourceWriteFields {
  return {
    sourceType: "GREENHOUSE",
    sourceJobId: null,
    sourceUrl: url,
    applicationUrl: null,
    raw: null,
  };
}
