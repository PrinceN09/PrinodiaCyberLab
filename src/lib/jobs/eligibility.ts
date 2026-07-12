/**
 * JobEligibilityService — pure rules for the seven-day window,
 * Canadian work eligibility, default exclusions, and the 7-level
 * location priority ranking. No I/O, fully unit-testable.
 */
import type { EligibilityVerdict, NormalizedJob } from "./types";
import {
  DEFAULT_JOB_PREFERENCES,
  type JobPreferences,
} from "./preferences";

export const JOB_MAX_AGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Seven-day rule. Uses the ORIGINAL posting date when the source
 * provides one; falls back to firstSeenAt only when it doesn't
 * (documented limitation — never uses importedAt alone).
 */
export function isWithinAgeWindow(
  sourcePostedAt: Date | null,
  firstSeenAt: Date,
  now: Date = new Date(),
  maxAgeDays: number = JOB_MAX_AGE_DAYS
): boolean {
  const reference = sourcePostedAt ?? firstSeenAt;
  const age = now.getTime() - reference.getTime();
  return age >= 0 ? age <= maxAgeDays * DAY_MS : true; // future dates: keep
}

// ── Text detectors ──────────────────────────────

export function detectUSResidencyRequirement(text: string): boolean {
  const t = text.toLowerCase();
  if (/open to (candidates|applicants) in (canada|canada (and|or) the (us|united states))/.test(t)) {
    return false;
  }
  return (
    /must (be located|reside|live) in the (us|u\.s\.|united states)/.test(t) ||
    /(us|u\.s\.|united states)[- ](based|residents?) only/.test(t) ||
    /only (open to|available to) (us|u\.s\.|united states) residents/.test(t) ||
    /authorized to work in the (us|u\.s\.|united states)(?![^.]*canada)/.test(t) ||
    /remote \(us(a)? only\)/.test(t)
  );
}

export function detectCitizenshipRequirement(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /(us|u\.s\.|united states|american) citizen(ship)? (is )?required/.test(t) ||
    /must be a (us|u\.s\.|united states) citizen/.test(t) ||
    /citizenship:? (us|u\.s\.|united states)/.test(t)
  );
}

export function detectSecurityClearance(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /security clearance (is )?required/.test(t) ||
    /active (ts|top secret|secret|ts\/sci) clearance/.test(t) ||
    /must (hold|possess|be able to obtain) a .{0,20}clearance/.test(t) ||
    /\bts\/sci\b/.test(t)
  );
}

// ── Location priority ───────────────────────────
//
// Preference-aware ranking (Canada-wide relocation enabled by default):
//   1  Remote anywhere in Canada
//   2  Remote explicitly open to both Canada and the US
//   3  Vancouver / Metro Vancouver (remote, hybrid, or on-site)
//   4  British Columbia hybrid or on-site
//   5  Hybrid or on-site anywhere else in Canada (relocation)
//   6  Remote North America / Americas explicitly including Canada
//   7  Eligible but lower-confidence Canadian roles (manual review)
//   99 Ineligible or too ambiguous to confirm Canadian eligibility
//
// A Toronto/Ottawa/Calgary/Montreal role is NEVER rejected just
// because home is Vancouver — relocation makes it priority 5.

const METRO_VANCOUVER_CITIES = new Set([
  "vancouver", "burnaby", "richmond", "surrey", "coquitlam",
  "north vancouver", "west vancouver", "new westminster", "delta",
  "langley", "port coquitlam", "port moody", "white rock",
  "maple ridge", "pitt meadows", "anmore", "belcarra", "bowen island",
  "lions bay", "tsawwassen",
]);

type LocationInput = Pick<
  NormalizedJob,
  | "city"
  | "province"
  | "country"
  | "workplaceType"
  | "acceptsCanadianApplicants"
  | "requiresUSResidency"
  | "description"
>;

const CANADA_EXPLICIT_RE = /\bcanad(a|ian)s?\b/i;
const NORTH_AMERICA_RE = /\bnorth america\b|\bamericas\b/i;
const US_SIGNAL_RE = /\b(us|u\.s\.|usa|united states)\b/i;

export function locationPriority(
  job: LocationInput,
  prefs: JobPreferences = DEFAULT_JOB_PREFERENCES
): number {
  if (job.requiresUSResidency || !job.acceptsCanadianApplicants) return 99;

  const city = job.city?.toLowerCase() ?? null;
  const inCanada = job.country === "Canada" || (!job.country && !!job.province);
  const remote = job.workplaceType === "REMOTE";

  // ── Identifiably located in Canada ──
  if (inCanada) {
    if (remote) return prefs.remoteCanada ? 1 : 99;
    if (job.workplaceType === "HYBRID" && !prefs.hybridCanada) return 99;
    if (job.workplaceType === "ON_SITE" && !prefs.onsiteCanada) return 99;

    const metro =
      city !== null &&
      METRO_VANCOUVER_CITIES.has(city) &&
      job.province === "BC";
    if (metro) return 3;
    if (job.province === "BC") return 4;
    // Elsewhere in Canada: eligible via relocation only.
    return prefs.willingToRelocate ? 5 : 99;
  }

  // ── Not identifiably in Canada: remote-only, explicit signals ──
  if (!remote) return 99;
  const d = job.description;
  if (!CANADA_EXPLICIT_RE.test(d)) {
    // Includes bare "North America"/"Americas" listings: too
    // ambiguous to confirm Canadian eligibility → never discovered.
    return 99;
  }
  if (US_SIGNAL_RE.test(d) || job.country === "United States") {
    return prefs.remoteUSIfCanadaEligible ? 2 : 99;
  }
  if (NORTH_AMERICA_RE.test(d)) return 6;
  // Canada is mentioned but location metadata is weak → manual review.
  return 7;
}

// ── Default exclusions ──────────────────────────

type ExclusionInput = Pick<
  NormalizedJob,
  | "title"
  | "company"
  | "sourceUrl"
  | "description"
  | "employmentType"
  | "requiresUSResidency"
  | "requiresCitizenship"
  | "requiresSecurityClearance"
  | "acceptsCanadianApplicants"
> & { sourcePostedAt: Date | null };

/**
 * Applies the default exclusions, preference-aware. Saved/applied
 * jobs are exempted from archival at the persistence layer, not here.
 */
export function evaluateEligibility(
  job: ExclusionInput,
  {
    firstSeenAt = new Date(),
    now = new Date(),
    prefs = DEFAULT_JOB_PREFERENCES,
  }: { firstSeenAt?: Date; now?: Date; prefs?: JobPreferences } = {}
): EligibilityVerdict {
  const reasons: string[] = [];
  // The 7-day rule is a hard cap; preferences may only narrow it.
  const maxAgeDays = Math.min(prefs.maxJobAgeDays, JOB_MAX_AGE_DAYS);

  if (!job.title?.trim() || !job.company?.trim() || !job.sourceUrl?.trim()) {
    reasons.push("Incomplete posting (missing title, company, or URL)");
  }
  if (!isWithinAgeWindow(job.sourcePostedAt, firstSeenAt, now, maxAgeDays)) {
    reasons.push(`Older than ${maxAgeDays} days`);
  }
  if (job.employmentType === "INTERNSHIP") reasons.push("Internship");
  if (job.employmentType === "TEMPORARY") reasons.push("Temporary role");
  if (job.employmentType === "COMMISSION") reasons.push("Commission-only");
  // Preference-driven employment filter (contract-only and part-time
  // are excluded by the FULL_TIME-only default; UNKNOWN passes).
  if (
    (job.employmentType === "CONTRACT" ||
      job.employmentType === "PART_TIME" ||
      job.employmentType === "FULL_TIME") &&
    !prefs.employmentTypes.includes(job.employmentType)
  ) {
    reasons.push(
      `Employment type ${job.employmentType.toLowerCase().replace("_", "-")} is outside your preferences`
    );
  }
  if (/\bunpaid\b|\bvolunteer\b/i.test(job.description)) {
    reasons.push("Unpaid position");
  }
  if (job.requiresUSResidency) reasons.push("Requires US residency");
  if (job.requiresCitizenship) reasons.push("Requires US citizenship");
  if (job.requiresSecurityClearance) reasons.push("Requires security clearance");
  if (!job.acceptsCanadianApplicants) {
    reasons.push("Cannot employ Canadian residents");
  }

  const priority = locationPriority(job as LocationInput & ExclusionInput, prefs);
  if (priority === 99 && reasons.length === 0) {
    reasons.push(
      "Location eligibility is ambiguous — Canadian eligibility could not be confirmed"
    );
  }

  return {
    eligible: reasons.length === 0 && priority !== 99,
    locationPriority: priority,
    reasons,
  };
}

/**
 * Canonical "appears in active job discovery" predicate. A posting
 * can be active-but-ineligible (saved/applied jobs are retained for
 * historical tracking after turning US-only, gaining citizenship or
 * clearance requirements, …) — those must never surface in discovery.
 * The dashboard's Prisma filter (DISCOVERABLE_WHERE in store.ts)
 * mirrors this exactly.
 */
export function isDiscoverable(posting: {
  isActive: boolean;
  locationPriority: number;
  acceptsCanadianApplicants: boolean;
  requiresUSResidency: boolean;
  requiresCitizenship: boolean;
  requiresSecurityClearance: boolean;
}): boolean {
  return (
    posting.isActive &&
    posting.locationPriority < 99 &&
    posting.acceptsCanadianApplicants &&
    !posting.requiresUSResidency &&
    !posting.requiresCitizenship &&
    !posting.requiresSecurityClearance
  );
}

/**
 * Archival check for the scheduled cleanup job: postings past the
 * seven-day window are archived unless saved or applied.
 */
export function shouldArchive(
  job: { sourcePostedAt: Date | null; firstSeenAt: Date },
  hasSavedOrApplication: boolean,
  now: Date = new Date()
): boolean {
  if (hasSavedOrApplication) return false;
  return !isWithinAgeWindow(job.sourcePostedAt, job.firstSeenAt, now);
}
