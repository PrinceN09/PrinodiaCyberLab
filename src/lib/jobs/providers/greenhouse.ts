/**
 * Greenhouse Job Board API provider (OFFICIAL, public, no auth).
 *
 * Docs: https://developers.greenhouse.io/job-board.html
 *   GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
 *   GET https://boards-api.greenhouse.io/v1/boards/{board_token}
 *
 * identifier = the company's board token (e.g. "gitlab").
 * Posting date: `first_published` when present, else `updated_at`
 * (documented caveat: updated_at moves when the employer edits).
 * The `content` field arrives HTML-entity-escaped and is decoded here.
 */
import type { JobSourceProvider, FetchContext, RawJobInput } from "../types";
import { decodeHtmlEntities, fetchJson } from "../http";

const BASE = "https://boards-api.greenhouse.io/v1/boards";

type GreenhouseLocation = { name?: string | null };

export type GreenhouseJob = {
  id: number;
  internal_job_id?: number;
  title: string;
  updated_at?: string;
  first_published?: string;
  absolute_url: string;
  content?: string;
  location?: GreenhouseLocation | null;
  offices?: { name?: string }[];
  metadata?: unknown;
};

type GreenhouseJobsResponse = { jobs: GreenhouseJob[]; meta?: { total?: number } };
type GreenhouseBoardResponse = { name?: string; content?: string };

function postedAt(job: GreenhouseJob): Date | null {
  const raw = job.first_published ?? job.updated_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const greenhouseProvider: JobSourceProvider = {
  sourceType: "GREENHOUSE",
  official: true,
  enabledByDefault: true,
  complianceNote:
    "Official Greenhouse Job Board API — public, unauthenticated, " +
    "documented at developers.greenhouse.io. Per-company board token.",

  async fetchJobs(identifier: string, ctx: FetchContext): Promise<RawJobInput[]> {
    const token = encodeURIComponent(identifier.trim().toLowerCase());

    // Board metadata gives the employer's display name.
    let company = ctx.sourceLabel ?? identifier;
    try {
      const board = await fetchJson<GreenhouseBoardResponse>(`${BASE}/${token}`, {
        signal: ctx.signal,
      });
      if (board.name?.trim()) company = board.name.trim();
    } catch {
      ctx.log(`greenhouse:${identifier} board metadata unavailable, using label`);
    }

    const data = await fetchJson<GreenhouseJobsResponse>(
      `${BASE}/${token}/jobs?content=true`,
      { signal: ctx.signal }
    );

    const results: RawJobInput[] = [];
    for (const job of data.jobs ?? []) {
      const posted = postedAt(job);
      // Keep jobs with unknown dates — eligibility falls back to firstSeenAt.
      if (posted && posted < ctx.since) continue;

      results.push({
        sourceType: "GREENHOUSE",
        sourceJobId: String(job.id),
        sourceUrl: job.absolute_url,
        applicationUrl: job.absolute_url, // Greenhouse hosts the application
        title: job.title,
        company,
        descriptionHtml: job.content ? decodeHtmlEntities(job.content) : null,
        location:
          job.location?.name ??
          job.offices?.map((o) => o.name).filter(Boolean).join(", ") ??
          null,
        postedAt: posted,
        raw: job,
      });
    }

    ctx.log(
      `greenhouse:${identifier} → ${results.length}/${data.jobs?.length ?? 0} jobs within window`
    );
    return results;
  },
};
