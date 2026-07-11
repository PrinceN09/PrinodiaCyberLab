/**
 * Lever Postings API provider (OFFICIAL, public, no auth).
 *
 * Docs: https://github.com/lever/postings-api
 *   GET https://api.lever.co/v0/postings/{site}?mode=json
 *
 * identifier = the company's Lever site slug (e.g. "leverdemo").
 * The API does not return a company display name; ctx.sourceLabel
 * (from JobSourceConfig) is used, falling back to the slug.
 * `createdAt` is the original posting timestamp (ms epoch).
 */
import type {
  JobEmploymentType,
  SalaryPeriod,
  WorkplaceType,
} from "@prisma/client";
import type { JobSourceProvider, FetchContext, RawJobInput } from "../types";
import { fetchJson } from "../http";

const BASE = "https://api.lever.co/v0/postings";

export type LeverPosting = {
  id: string;
  text: string; // title
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number; // ms epoch
  workplaceType?: "remote" | "hybrid" | "onsite" | "unspecified";
  categories?: {
    location?: string;
    allLocations?: string[];
    team?: string;
    commitment?: string;
  };
  country?: string;
  description?: string; // HTML
  descriptionPlain?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string; // e.g. "per-year-salary"
  };
};

function mapWorkplace(w?: LeverPosting["workplaceType"]): WorkplaceType | null {
  switch (w) {
    case "remote":
      return "REMOTE";
    case "hybrid":
      return "HYBRID";
    case "onsite":
      return "ON_SITE";
    default:
      return null;
  }
}

function mapCommitment(c?: string): JobEmploymentType | null {
  if (!c) return null;
  const t = c.toLowerCase();
  if (t.includes("intern")) return "INTERNSHIP";
  if (t.includes("part")) return "PART_TIME";
  if (t.includes("contract")) return "CONTRACT";
  if (t.includes("temp")) return "TEMPORARY";
  if (t.includes("full")) return "FULL_TIME";
  return null;
}

function mapSalaryPeriod(interval?: string): SalaryPeriod | null {
  if (!interval) return null;
  const t = interval.toLowerCase();
  if (t.includes("year") || t.includes("annual")) return "YEAR";
  if (t.includes("month")) return "MONTH";
  if (t.includes("week")) return "WEEK";
  if (t.includes("day")) return "DAY";
  if (t.includes("hour")) return "HOUR";
  return null;
}

export const leverProvider: JobSourceProvider = {
  sourceType: "LEVER",
  official: true,
  enabledByDefault: true,
  complianceNote:
    "Official Lever Postings API — public, unauthenticated, documented " +
    "at github.com/lever/postings-api. Per-company site slug.",

  async fetchJobs(identifier: string, ctx: FetchContext): Promise<RawJobInput[]> {
    const site = encodeURIComponent(identifier.trim().toLowerCase());
    const company = ctx.sourceLabel?.trim() || identifier.trim();

    const postings = await fetchJson<LeverPosting[]>(
      `${BASE}/${site}?mode=json`,
      { signal: ctx.signal }
    );

    const results: RawJobInput[] = [];
    for (const p of postings ?? []) {
      const posted =
        typeof p.createdAt === "number" ? new Date(p.createdAt) : null;
      if (posted && posted < ctx.since) continue;

      const location =
        p.categories?.allLocations?.join(" / ") ||
        p.categories?.location ||
        p.country ||
        null;

      results.push({
        sourceType: "LEVER",
        sourceJobId: p.id,
        sourceUrl: p.hostedUrl,
        applicationUrl: p.applyUrl ?? p.hostedUrl,
        title: p.text,
        company,
        descriptionHtml: p.description ?? null,
        descriptionText: p.descriptionPlain ?? null,
        location,
        workplaceTypeHint: mapWorkplace(p.workplaceType),
        employmentTypeHint: mapCommitment(p.categories?.commitment),
        salaryMin: p.salaryRange?.min ?? null,
        salaryMax: p.salaryRange?.max ?? null,
        salaryCurrency: p.salaryRange?.currency ?? null,
        salaryPeriod: mapSalaryPeriod(p.salaryRange?.interval),
        postedAt: posted,
        raw: p,
      });
    }

    ctx.log(
      `lever:${identifier} → ${results.length}/${postings?.length ?? 0} jobs within window`
    );
    return results;
  },
};
