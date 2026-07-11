/**
 * DTO mapping for job postings sent to the client. One shape for the
 * dashboard list and the details page — dates become ISO strings and
 * only client-relevant fields are exposed (raw payloads stay server-side).
 */
import type { Prisma } from "@prisma/client";

export const POSTING_LIST_SELECT = {
  id: true,
  title: true,
  company: true,
  companyLogo: true,
  location: true,
  city: true,
  province: true,
  country: true,
  workplaceType: true,
  employmentType: true,
  seniority: true,
  locationPriority: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  salaryPeriod: true,
  sourcePostedAt: true,
  firstSeenAt: true,
  lastVerifiedAt: true,
  expiresAt: true,
  applicationUrl: true,
  primarySourceUrl: true,
  sources: { select: { sourceType: true, sourceUrl: true } },
  applications: { select: { id: true, status: true } },
} satisfies Prisma.JobPostingSelect;

type PostingRow = Prisma.JobPostingGetPayload<{
  select: typeof POSTING_LIST_SELECT;
}>;

export type JobPostingDto = ReturnType<typeof toPostingDto>;

export function toPostingDto(p: PostingRow) {
  return {
    id: p.id,
    title: p.title,
    company: p.company,
    companyLogo: p.companyLogo,
    location: p.location,
    city: p.city,
    province: p.province,
    country: p.country,
    workplaceType: p.workplaceType,
    employmentType: p.employmentType,
    seniority: p.seniority,
    locationPriority: p.locationPriority,
    salaryMin: p.salaryMin,
    salaryMax: p.salaryMax,
    salaryCurrency: p.salaryCurrency,
    salaryPeriod: p.salaryPeriod,
    sourcePostedAt: p.sourcePostedAt?.toISOString() ?? null,
    firstSeenAt: p.firstSeenAt.toISOString(),
    lastVerifiedAt: p.lastVerifiedAt.toISOString(),
    expiresAt: p.expiresAt?.toISOString() ?? null,
    applicationUrl: p.applicationUrl,
    primarySourceUrl: p.primarySourceUrl,
    sources: p.sources.map((s) => ({
      sourceType: s.sourceType,
      sourceUrl: s.sourceUrl,
    })),
    application: p.applications[0]
      ? { id: p.applications[0].id, status: p.applications[0].status }
      : null,
  };
}
