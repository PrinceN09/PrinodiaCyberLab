/**
 * Discovery query layer — pure, unit-testable functions that turn
 * untrusted query params into validated Prisma filters.
 *
 * DISCOVERABLE_WHERE is the MANDATORY server-side filter for active
 * discovery: buildJobWhere() always spreads it, so no UI component
 * ever re-implements (or can bypass) eligibility logic.
 */
import type {
  JobEmploymentType,
  JobSourceType,
  JobStatus,
  Prisma,
  SeniorityLevel,
  WorkplaceType,
} from "@prisma/client";
import { JOB_MAX_AGE_DAYS } from "./eligibility";

/** Prisma mirror of eligibility.isDiscoverable — keep in sync. */
export const DISCOVERABLE_WHERE = {
  isActive: true,
  locationPriority: { lt: 99 },
  acceptsCanadianApplicants: true,
  requiresUSResidency: false,
  requiresCitizenship: false,
  requiresSecurityClearance: false,
} satisfies Prisma.JobPostingWhereInput;

export const LOCATION_PRIORITY_LABELS: Record<number, string> = {
  1: "Vancouver, BC",
  2: "Metro Vancouver",
  3: "British Columbia",
  4: "Remote — Canada",
  5: "Canada",
  6: "Remote — Canada & US",
  7: "US remote (Canada eligible)",
};

export function locationPriorityLabel(priority: number): string {
  return LOCATION_PRIORITY_LABELS[priority] ?? "Eligibility unclear";
}

// ── Query parsing ───────────────────────────────

export const JOB_SORTS = [
  "match",
  "priority",
  "recent",
  "salary",
  "gaps",
] as const;
export type JobSort = (typeof JOB_SORTS)[number];

const WORKPLACES: WorkplaceType[] = ["REMOTE", "HYBRID", "ON_SITE", "UNKNOWN"];
const EMPLOYMENT: JobEmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "UNKNOWN",
];
const SENIORITIES: SeniorityLevel[] = [
  "ENTRY",
  "ASSOCIATE",
  "INTERMEDIATE",
  "SENIOR",
  "LEAD",
  "UNKNOWN",
];
const SOURCES: JobSourceType[] = [
  "GREENHOUSE",
  "LEVER",
  "ASHBY",
  "SMARTRECRUITERS",
  "WORKDAY",
  "JOB_BANK_CA",
  "HIRING_CAFE",
  "EMPLOYER_DIRECT",
  "MANUAL",
];
const PROVINCES = [
  "BC", "AB", "SK", "MB", "ON", "QC", "NS", "NB", "PE", "NL", "YT", "NT", "NU",
];

export const JOB_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export type JobQuery = {
  q: string;
  workplace: WorkplaceType | null;
  employment: JobEmploymentType | null;
  seniority: SeniorityLevel | null;
  province: string | null;
  source: JobSourceType | null;
  salaryMin: number | null;
  postedWithinDays: number;
  sort: JobSort;
  page: number;
  pageSize: number;
};

type ParamsLike = { get(name: string): string | null };

function oneOf<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | null {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function clampInt(
  value: string | null,
  { min, max, fallback }: { min: number; max: number; fallback: number }
): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Validates untrusted search params into a safe JobQuery. */
export function parseJobQuery(params: ParamsLike): JobQuery {
  return {
    q: (params.get("q") ?? "").trim().slice(0, 120),
    workplace: oneOf(params.get("workplace"), WORKPLACES),
    employment: oneOf(params.get("employment"), EMPLOYMENT),
    seniority: oneOf(params.get("seniority"), SENIORITIES),
    province: oneOf(params.get("province"), PROVINCES),
    source: oneOf(params.get("source"), SOURCES),
    salaryMin: params.get("salaryMin")
      ? clampInt(params.get("salaryMin"), { min: 0, max: 1_000_000, fallback: 0 }) || null
      : null,
    postedWithinDays: clampInt(params.get("days"), {
      min: 1,
      max: JOB_MAX_AGE_DAYS,
      fallback: JOB_MAX_AGE_DAYS,
    }),
    sort: oneOf(params.get("sort"), JOB_SORTS) ?? "match",
    page: clampInt(params.get("page"), { min: 1, max: 10_000, fallback: 1 }),
    pageSize: clampInt(params.get("pageSize"), {
      min: 1,
      max: MAX_PAGE_SIZE,
      fallback: JOB_PAGE_SIZE,
    }),
  };
}

// ── Prisma filter/sort builders ─────────────────

export function buildJobWhere(
  query: JobQuery,
  now: Date = new Date()
): Prisma.JobPostingWhereInput {
  const cutoff = new Date(
    now.getTime() - query.postedWithinDays * 24 * 60 * 60 * 1000
  );

  const and: Prisma.JobPostingWhereInput[] = [
    // Age window: original posting date, firstSeenAt fallback.
    {
      OR: [
        { sourcePostedAt: { gte: cutoff } },
        { sourcePostedAt: null, firstSeenAt: { gte: cutoff } },
      ],
    },
  ];

  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { company: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { location: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  if (query.workplace) and.push({ workplaceType: query.workplace });
  if (query.employment) and.push({ employmentType: query.employment });
  if (query.seniority) and.push({ seniority: query.seniority });
  if (query.province) and.push({ province: query.province });
  if (query.source) {
    and.push({ sources: { some: { sourceType: query.source } } });
  }
  if (query.salaryMin) {
    and.push({
      OR: [
        { salaryMax: { gte: query.salaryMin } },
        { salaryMax: null, salaryMin: { gte: query.salaryMin } },
      ],
    });
  }

  // The mandatory eligibility filter is always applied last so no
  // caller-supplied condition can widen it.
  return { AND: and, ...DISCOVERABLE_WHERE };
}

export function buildJobOrderBy(
  sort: JobSort
): Prisma.JobPostingOrderByWithRelationInput[] {
  switch (sort) {
    case "match":
      return [
        { matchScore: { sort: "desc", nulls: "last" } },
        { locationPriority: "asc" },
        { sourcePostedAt: { sort: "desc", nulls: "last" } },
      ];
    case "gaps":
      return [
        { missingSkillCount: { sort: "asc", nulls: "last" } },
        { matchScore: { sort: "desc", nulls: "last" } },
        { locationPriority: "asc" },
      ];
    case "recent":
      return [
        { sourcePostedAt: { sort: "desc", nulls: "last" } },
        { firstSeenAt: "desc" },
      ];
    case "salary":
      return [
        { salaryMax: { sort: "desc", nulls: "last" } },
        { salaryMin: { sort: "desc", nulls: "last" } },
        { locationPriority: "asc" },
      ];
    case "priority":
    default:
      return [
        { locationPriority: "asc" },
        { matchScore: { sort: "desc", nulls: "last" } },
        { sourcePostedAt: { sort: "desc", nulls: "last" } },
      ];
  }
}

// ── Save/unsave guard ───────────────────────────

/**
 * Unsaving may only delete an application that hasn't progressed:
 * anything beyond SAVED is real tracking history and must be kept.
 */
export function canUnsave(status: JobStatus): boolean {
  return status === "DISCOVERED" || status === "SAVED";
}

// ── Display helpers (client-safe) ───────────────

export function postingAgeDays(
  sourcePostedAt: Date | string | null,
  firstSeenAt: Date | string,
  now: Date = new Date()
): number {
  const ref = sourcePostedAt ?? firstSeenAt;
  const d = typeof ref === "string" ? new Date(ref) : ref;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

export function formatPostingAge(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null
): string | null {
  if (min === null && max === null) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  const range =
    min !== null && max !== null && min !== max
      ? `${fmt(min)}–${fmt(max)}`
      : fmt((max ?? min)!);
  const suffix =
    period === "YEAR" || period === null
      ? "/yr"
      : period === "HOUR"
        ? "/hr"
        : `/${period.toLowerCase()}`;
  return `${currency ?? "$"} ${range}${suffix}`;
}
