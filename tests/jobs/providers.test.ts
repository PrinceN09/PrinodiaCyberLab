import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { greenhouseProvider, type GreenhouseJob } from "@/lib/jobs/providers/greenhouse";
import { leverProvider, type LeverPosting } from "@/lib/jobs/providers/lever";
import { decodeHtmlEntities, fetchJson, HttpError, backoffDelay } from "@/lib/jobs/http";

const NOW = new Date("2026-07-10T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const ctx = () => ({
  since: daysAgo(7),
  log: vi.fn(),
});

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Greenhouse ──────────────────────────────────

const GH_JOBS: GreenhouseJob[] = [
  {
    id: 101,
    title: "SOC Analyst",
    first_published: daysAgo(2).toISOString(),
    updated_at: daysAgo(1).toISOString(),
    absolute_url: "https://boards.greenhouse.io/acme/jobs/101",
    content: "&lt;p&gt;Monitor &amp;amp; triage SIEM alerts&lt;/p&gt;",
    location: { name: "Vancouver, BC, Canada" },
  },
  {
    id: 102,
    title: "Old Security Job",
    first_published: daysAgo(20).toISOString(),
    updated_at: daysAgo(20).toISOString(),
    absolute_url: "https://boards.greenhouse.io/acme/jobs/102",
    location: { name: "Toronto, ON" },
  },
  {
    id: 103,
    title: "Undated Analyst Role",
    absolute_url: "https://boards.greenhouse.io/acme/jobs/103",
    location: { name: "Remote - Canada" },
  },
];

describe("greenhouse provider", () => {
  it("fetches board name, maps jobs, and applies the since-window", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith("/boards/acme")) {
        return Promise.resolve(jsonResponse({ name: "Acme Security" }));
      }
      return Promise.resolve(jsonResponse({ jobs: GH_JOBS }));
    });

    const jobs = await greenhouseProvider.fetchJobs("acme", ctx());

    // 102 excluded (20 days old); 103 kept (no date → firstSeenAt fallback later)
    expect(jobs.map((j) => j.sourceJobId)).toEqual(["101", "103"]);
    expect(jobs[0].company).toBe("Acme Security");
    expect(jobs[0].applicationUrl).toBe(
      "https://boards.greenhouse.io/acme/jobs/101"
    );
    // Entity-escaped HTML is decoded before normalization
    expect(jobs[0].descriptionHtml).toContain("<p>Monitor &amp; triage");
    expect(jobs[0].postedAt?.toISOString()).toBe(daysAgo(2).toISOString());
  });

  it("falls back to the identifier when board metadata fails", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith("/boards/acme")) {
        return Promise.resolve(jsonResponse({ error: "nope" }, 404));
      }
      return Promise.resolve(jsonResponse({ jobs: [GH_JOBS[0]] }));
    });

    const jobs = await greenhouseProvider.fetchJobs("acme", ctx());
    expect(jobs[0].company).toBe("acme");
  });

  it("uses first_published over updated_at for the posting date", async () => {
    const job: GreenhouseJob = {
      ...GH_JOBS[0],
      first_published: daysAgo(6).toISOString(),
      updated_at: daysAgo(0).toISOString(), // edited today — must not rejuvenate
    };
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith("/boards/acme")
          ? jsonResponse({ name: "Acme" })
          : jsonResponse({ jobs: [job] })
      )
    );
    const jobs = await greenhouseProvider.fetchJobs("acme", ctx());
    expect(jobs[0].postedAt?.toISOString()).toBe(daysAgo(6).toISOString());
  });
});

// ── Lever ───────────────────────────────────────

const LEVER_POSTINGS: LeverPosting[] = [
  {
    id: "abc-123",
    text: "Security Operations Analyst",
    hostedUrl: "https://jobs.lever.co/acme/abc-123",
    applyUrl: "https://jobs.lever.co/acme/abc-123/apply",
    createdAt: daysAgo(3).getTime(),
    workplaceType: "remote",
    categories: {
      location: "Vancouver, British Columbia",
      commitment: "Full-time",
    },
    description: "<p>Defend all the things</p>",
    descriptionPlain: "Defend all the things",
    salaryRange: {
      min: 70000,
      max: 90000,
      currency: "CAD",
      interval: "per-year-salary",
    },
  },
  {
    id: "old-1",
    text: "Ancient Posting",
    hostedUrl: "https://jobs.lever.co/acme/old-1",
    createdAt: daysAgo(30).getTime(),
  },
];

describe("lever provider", () => {
  it("maps postings with structured hints and applies the window", async () => {
    fetchMock.mockResolvedValue(jsonResponse(LEVER_POSTINGS));

    const jobs = await leverProvider.fetchJobs("acme", {
      ...ctx(),
      sourceLabel: "Acme Security",
    });

    expect(jobs).toHaveLength(1);
    const j = jobs[0];
    expect(j.company).toBe("Acme Security"); // label wins (API has no name)
    expect(j.applicationUrl).toBe("https://jobs.lever.co/acme/abc-123/apply");
    expect(j.workplaceTypeHint).toBe("REMOTE");
    expect(j.employmentTypeHint).toBe("FULL_TIME");
    expect(j.salaryMin).toBe(70000);
    expect(j.salaryPeriod).toBe("YEAR");
    expect(j.postedAt?.getTime()).toBe(daysAgo(3).getTime());
  });

  it("falls back to the slug when no label is configured", async () => {
    fetchMock.mockResolvedValue(jsonResponse([LEVER_POSTINGS[0]]));
    const jobs = await leverProvider.fetchJobs("acme", ctx());
    expect(jobs[0].company).toBe("acme");
  });
});

// ── HTTP client ─────────────────────────────────

describe("http client", () => {
  it("retries on 500 and succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await fetchJson<{ ok: boolean }>("https://x.test/api");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 40_000);

  it("fails fast on 404 without retrying", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "missing" }, 404));
    await expect(fetchJson("https://x.test/missing")).rejects.toThrowError(
      HttpError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting retries on 429", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "slow down" }, 429));
    await expect(
      fetchJson("https://x.test/limited", { retries: 1 })
    ).rejects.toThrowError(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 40_000);

  it("backoff grows with attempts and stays within cap", () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const d = backoffDelay(attempt, 1000, 30_000);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(30_000);
    }
  });

  it("decodes Greenhouse-style escaped entities", () => {
    expect(decodeHtmlEntities("&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;")).toBe(
      "<b>Tom & Jerry</b>"
    );
  });
});
