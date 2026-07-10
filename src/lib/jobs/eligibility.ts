/**
 * JobEligibilityService — pure rules for the seven-day window,
 * Canadian work eligibility, default exclusions, and the 7-level
 * location priority ranking. No I/O, fully unit-testable.
 */
import type { EligibilityVerdict, NormalizedJob } from "./types";

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

// ── Location priority (spec order 1–7, 99 = ineligible) ──

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

export function locationPriority(job: LocationInput): number {
  const city = job.city?.toLowerCase() ?? null;
  const inCanada = job.country === "Canada" || (!job.country && !!job.province);
  const remote = job.workplaceType === "REMOTE";

  if (job.requiresUSResidency || !job.acceptsCanadianApplicants) return 99;

  if (city === "vancouver" && job.province === "BC") return 1;
  if (city && METRO_VANCOUVER_CITIES.has(city) && job.province === "BC") return 2;
  if (job.province === "BC") return 3;
  if (remote && inCanada) return 4;
  if (inCanada) return 5; // hybrid or on-site anywhere in Canada

  const d = job.description.toLowerCase();
  const mentionsCanada =
    /\bcanada\b|\bcanadian\b/.test(d) ||
    job.country === "Canada";
  if (remote && mentionsCanada) {
    // 6: remote roles open to both Canada and the US
    // 7: US remote roles that explicitly accept applicants in Canada
    const usRemote =
      job.country === "United States" ||
      /\b(us|u\.s\.|united states)\b/.test(d);
    return usRemote && job.country === "United States" ? 7 : 6;
  }

  // Unknown-location remote with no Canada signal: not eligible enough.
  return 99;
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
 * Applies the spec's default exclusions. Saved/applied jobs are
 * exempted from archival at the persistence layer, not here.
 */
export function evaluateEligibility(
  job: ExclusionInput,
  {
    firstSeenAt = new Date(),
    now = new Date(),
  }: { firstSeenAt?: Date; now?: Date } = {}
): EligibilityVerdict {
  const reasons: string[] = [];

  if (!job.title?.trim() || !job.company?.trim() || !job.sourceUrl?.trim()) {
    reasons.push("Incomplete posting (missing title, company, or URL)");
  }
  if (!isWithinAgeWindow(job.sourcePostedAt, firstSeenAt, now)) {
    reasons.push(`Older than ${JOB_MAX_AGE_DAYS} days`);
  }
  if (job.employmentType === "INTERNSHIP") reasons.push("Internship");
  if (job.employmentType === "TEMPORARY") reasons.push("Temporary role");
  if (job.employmentType === "COMMISSION") reasons.push("Commission-only");
  if (/\bunpaid\b|\bvolunteer\b/i.test(job.description)) {
    reasons.push("Unpaid position");
  }
  if (job.requiresUSResidency) reasons.push("Requires US residency");
  if (job.requiresCitizenship) reasons.push("Requires US citizenship");
  if (job.requiresSecurityClearance) reasons.push("Requires security clearance");
  if (!job.acceptsCanadianApplicants) {
    reasons.push("Cannot employ Canadian residents");
  }

  const priority = locationPriority(job as LocationInput & ExclusionInput);
  if (priority === 99 && reasons.length === 0) {
    reasons.push("No Canadian location eligibility detected");
  }

  return {
    eligible: reasons.length === 0 && priority !== 99,
    locationPriority: priority,
    reasons,
  };
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
