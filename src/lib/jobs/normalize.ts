/**
 * JobNormalizer — pure functions that turn RawJobInput into a
 * NormalizedJob. No I/O, no Prisma client: everything here is
 * deterministic and unit-testable.
 */
import type {
  JobEmploymentType,
  SeniorityLevel,
  WorkplaceType,
} from "@prisma/client";
import type { NormalizedJob, RawJobInput } from "./types";
import {
  detectCitizenshipRequirement,
  detectSecurityClearance,
  detectUSResidencyRequirement,
} from "./eligibility";

// ── Company ─────────────────────────────────────

const COMPANY_SUFFIXES =
  /\b(inc|inc\.|incorporated|ltd|ltd\.|limited|llc|l\.l\.c\.|corp|corp\.|corporation|co|co\.|gmbh|s\.a\.|plc|ulc|lp|llp)\b\.?$/i;

export function normalizeCompany(company: string): string {
  let s = company.toLowerCase().trim();
  s = s.replace(/[®™©]/g, "");
  // Strip trailing legal suffixes (possibly repeated: "Acme Corp Ltd.")
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(COMPANY_SUFFIXES, "").replace(/[,.]$/, "").trim();
  }
  return s.replace(/[^a-z0-9 &-]/g, "").replace(/\s+/g, " ").trim();
}

// ── Title ───────────────────────────────────────

/** Canonical target-title families used for categorization/matching. */
export const TARGET_TITLE_FAMILIES: { family: string; pattern: RegExp }[] = [
  { family: "SOC Analyst", pattern: /\bsoc\b|security operations (center|centre|analyst)/i },
  { family: "Cybersecurity Analyst", pattern: /\bcyber\s*security analyst|cybersecurity analyst|information security analyst|infosec analyst/i },
  { family: "Incident Response", pattern: /incident respon|cyber incident|csirt|dfir/i },
  { family: "Threat Detection / Hunting", pattern: /threat (detection|hunt|intel)/i },
  { family: "SIEM Analyst", pattern: /\bsiem\b/i },
  { family: "Vulnerability Management", pattern: /vulnerability (management|analyst)|vuln(erability)? analyst/i },
  { family: "GRC / Risk / Compliance", pattern: /\bgrc\b|governance|cyber risk|security compliance|risk analyst/i },
  { family: "Cloud Security", pattern: /cloud security/i },
  { family: "IAM", pattern: /\biam\b|identity (and|&) access/i },
  { family: "Penetration Testing", pattern: /penetration test|pentest|ethical hack|offensive security/i },
  { family: "Application Security", pattern: /application security|appsec|product security/i },
  { family: "DevSecOps", pattern: /devsecops/i },
  { family: "Security Engineer", pattern: /security (operations )?engineer/i },
];

export function titleFamily(title: string): string | null {
  for (const { family, pattern } of TARGET_TITLE_FAMILIES) {
    if (pattern.test(title)) return family;
  }
  return null;
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // parentheticals: "(Remote)", "(Contract)"
    .replace(/\b(remote|hybrid|on-?site|canada|usa?|ft|pt)\b/g, " ")
    .replace(/cyber\s+security/g, "cybersecurity")
    .replace(/\btier\s*(\d|i{1,3})\b/g, (_, t) => `t${romanToInt(String(t))}`)
    .replace(/\blevel\s*(\d|i{1,3})\b/g, (_, t) => `l${romanToInt(String(t))}`)
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function romanToInt(s: string): string {
  const map: Record<string, string> = { i: "1", ii: "2", iii: "3" };
  return map[s.toLowerCase()] ?? s;
}

// ── Location ────────────────────────────────────

const PROVINCES: Record<string, string> = {
  bc: "BC", "british columbia": "BC",
  ab: "AB", alberta: "AB",
  sk: "SK", saskatchewan: "SK",
  mb: "MB", manitoba: "MB",
  on: "ON", ontario: "ON",
  qc: "QC", quebec: "QC", "québec": "QC",
  ns: "NS", "nova scotia": "NS",
  nb: "NB", "new brunswick": "NB",
  pe: "PE", "prince edward island": "PE",
  nl: "NL", "newfoundland and labrador": "NL",
  yt: "YT", yukon: "YT",
  nt: "NT", "northwest territories": "NT",
  nu: "NU", nunavut: "NU",
};

const US_STATE_HINT =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;

export type ParsedLocation = {
  city: string | null;
  province: string | null;
  country: string | null;
};

export function parseLocation(location: string | null | undefined): ParsedLocation {
  if (!location?.trim()) return { city: null, province: null, country: null };
  const text = location.trim();
  const lower = text.toLowerCase();

  let country: string | null = null;
  if (/\bcanada\b|\bcanadian\b/.test(lower)) country = "Canada";
  else if (/\b(united states|usa|u\.s\.a?\.?|us only)\b/.test(lower)) country = "United States";

  let province: string | null = null;
  for (const [key, code] of Object.entries(PROVINCES)) {
    // Word-boundary match; two-letter codes must be uppercase in source.
    const re = key.length === 2 ? new RegExp(`\\b${key.toUpperCase()}\\b`) : new RegExp(`\\b${key}\\b`, "i");
    if (re.test(key.length === 2 ? text : lower)) {
      province = code;
      country = country ?? "Canada";
      break;
    }
  }

  if (!country && US_STATE_HINT.test(text) && !province) {
    country = "United States";
  }

  // City: first comma-separated segment that isn't "Remote"/country/province.
  const segments = text.split(/[,•|/]/).map((s) => s.trim()).filter(Boolean);
  let city: string | null = null;
  for (const seg of segments) {
    const segLower = seg.toLowerCase();
    if (/remote|hybrid|on-?site|anywhere/.test(segLower)) continue;
    if (segLower === "canada" || segLower === "usa" || segLower === "united states") continue;
    if (PROVINCES[segLower] || Object.values(PROVINCES).includes(seg.toUpperCase())) continue;
    if (seg.length < 2 || seg.length > 40) continue;
    city = seg;
    break;
  }

  return { city, province, country };
}

// ── Classification ──────────────────────────────

export function classifyWorkplace(
  hint: WorkplaceType | null | undefined,
  ...texts: (string | null | undefined)[]
): WorkplaceType {
  if (hint && hint !== "UNKNOWN") return hint;
  const t = texts.filter(Boolean).join(" ").toLowerCase();
  if (/\bhybrid\b/.test(t)) return "HYBRID";
  if (/\b(fully )?remote\b|work from home|\bwfh\b|telecommut/.test(t)) return "REMOTE";
  if (/\bon-?site\b|in-?office|in person/.test(t)) return "ON_SITE";
  return "UNKNOWN";
}

export function classifyEmployment(
  hint: JobEmploymentType | null | undefined,
  ...texts: (string | null | undefined)[]
): JobEmploymentType {
  if (hint && hint !== "UNKNOWN") return hint;
  const t = texts.filter(Boolean).join(" ").toLowerCase();
  if (/\bintern(ship)?\b|\bco-?op\b/.test(t)) return "INTERNSHIP";
  if (/commission[- ]only/.test(t)) return "COMMISSION";
  if (/\b(temporary|temp|seasonal)\b/.test(t)) return "TEMPORARY";
  if (/\b(contract|contractor|fixed[- ]term)\b/.test(t)) return "CONTRACT";
  if (/\bpart[- ]?time\b/.test(t)) return "PART_TIME";
  if (/\bfull[- ]?time\b|\bpermanent\b|\bfte\b/.test(t)) return "FULL_TIME";
  return "UNKNOWN";
}

export function classifySeniority(
  hint: SeniorityLevel | null | undefined,
  title: string,
  description?: string | null
): SeniorityLevel {
  if (hint && hint !== "UNKNOWN") return hint;
  const t = title.toLowerCase();
  if (/\b(principal|staff|lead|manager|director|head of)\b/.test(t)) return "LEAD";
  if (/\b(senior|sr\.?|iii|tier 3|l3)\b/.test(t)) return "SENIOR";
  if (/\b(junior|jr\.?|entry|graduate|grad|tier 1|t1|l1|associate)\b/.test(t)) {
    return /\bassociate\b/.test(t) ? "ASSOCIATE" : "ENTRY";
  }
  if (/\b(intermediate|ii|tier 2|t2|l2)\b/.test(t)) return "INTERMEDIATE";
  const d = (description ?? "").toLowerCase();
  if (/\b0-2 years|no experience required|entry[- ]level\b/.test(d)) return "ENTRY";
  if (/\b(5|6|7|8)\+? ?years\b/.test(d)) return "SENIOR";
  return "UNKNOWN";
}

// ── HTML stripping (providers often return HTML descriptions) ──

export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Main entry ──────────────────────────────────

export function normalizeJob(input: RawJobInput): NormalizedJob {
  const description =
    input.descriptionText?.trim() ||
    (input.descriptionHtml ? htmlToText(input.descriptionHtml) : "");

  const { city, province, country } = parseLocation(input.location);
  const haystack = `${input.title}\n${input.location ?? ""}\n${description}`;

  const requiresUSResidency = detectUSResidencyRequirement(haystack);

  return {
    sourceType: input.sourceType,
    sourceJobId: input.sourceJobId ?? null,
    sourceUrl: input.sourceUrl,
    applicationUrl: input.applicationUrl ?? null,

    title: input.title.trim(),
    normalizedTitle: normalizeTitle(input.title),
    company: input.company.trim(),
    normalizedCompany: normalizeCompany(input.company),
    companyLogo: input.companyLogo ?? null,
    description,

    location: input.location?.trim() || null,
    city,
    province,
    country,
    workplaceType: classifyWorkplace(input.workplaceTypeHint, input.title, input.location, description),
    employmentType: classifyEmployment(input.employmentTypeHint, input.title, description),
    seniority: classifySeniority(input.seniorityHint, input.title, description),

    salaryMin: input.salaryMin ?? null,
    salaryMax: input.salaryMax ?? null,
    salaryCurrency: input.salaryCurrency ?? null,
    salaryPeriod: input.salaryPeriod ?? null,

    requiresUSResidency,
    acceptsCanadianApplicants: !requiresUSResidency,
    requiresCitizenship: detectCitizenshipRequirement(haystack),
    requiresSecurityClearance: detectSecurityClearance(haystack),

    sourcePostedAt: input.postedAt ?? null,
    expiresAt: input.expiresAt ?? null,
    raw: input.raw ?? null,
  };
}
