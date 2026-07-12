/**
 * Job-search preferences — pure types, safe defaults, and validation.
 * The Prisma loader lives in preferences-service.ts; eligibility and
 * matching NEVER hard-code these values, they receive them as input
 * (with DEFAULT_JOB_PREFERENCES as the no-record fallback).
 */
import type { JobEmploymentType } from "@prisma/client";

export const WORKPLACE_ZONE_KEYS = [
  "REMOTE_CANADA",
  "REMOTE_US_CANADA",
  "VANCOUVER_METRO",
  "BC",
  "CANADA_WIDE",
] as const;
export type WorkplaceZoneKey = (typeof WORKPLACE_ZONE_KEYS)[number];

export type JobPreferences = {
  homeCity: string;
  homeProvince: string;
  homeCountry: string;
  willingToRelocate: boolean;
  relocationCountries: string[];
  preferredCountries: string[];
  remoteCanada: boolean;
  remoteUSIfCanadaEligible: boolean;
  hybridCanada: boolean;
  onsiteCanada: boolean;
  employmentTypes: JobEmploymentType[];
  permanentPreferred: boolean;
  maxJobAgeDays: number;
  minimumMatchScore: number;
  preferredWorkplaceOrder: WorkplaceZoneKey[];
};

/**
 * Returns a fresh deep copy of the defaults — callers can mutate
 * their copy without leaking state to other users/requests.
 */
export function defaultJobPreferences(): JobPreferences {
  return structuredClone(DEFAULT_JOB_PREFERENCES);
}

/** Prince's documented job-search profile (safe no-record fallback). */
export const DEFAULT_JOB_PREFERENCES: JobPreferences = {
  homeCity: "Vancouver",
  homeProvince: "BC",
  homeCountry: "Canada",
  willingToRelocate: true,
  relocationCountries: ["Canada"],
  preferredCountries: ["Canada"],
  remoteCanada: true,
  remoteUSIfCanadaEligible: true,
  hybridCanada: true,
  onsiteCanada: true,
  employmentTypes: ["FULL_TIME"],
  permanentPreferred: true,
  maxJobAgeDays: 7,
  minimumMatchScore: 0,
  preferredWorkplaceOrder: [
    "REMOTE_CANADA",
    "REMOTE_US_CANADA",
    "VANCOUVER_METRO",
    "BC",
    "CANADA_WIDE",
  ],
};

const EMPLOYMENT_TYPES: JobEmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERNSHIP",
  "COMMISSION",
  "UNKNOWN",
];

function stringArray(value: unknown, maxLen = 10): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.some((v) => typeof v !== "string" || v.length > 60)) return null;
  return (value as string[]).slice(0, maxLen);
}

/**
 * Validates an untrusted PATCH body into a partial preferences
 * update. Returns null when any provided field is malformed.
 */
export function validatePreferencePatch(
  body: unknown
): Partial<JobPreferences> | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const patch: Partial<JobPreferences> = {};

  for (const key of ["homeCity", "homeProvince", "homeCountry"] as const) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== "string" || (b[key] as string).length > 60) {
        return null;
      }
      patch[key] = (b[key] as string).trim();
    }
  }
  for (const key of [
    "willingToRelocate",
    "remoteCanada",
    "remoteUSIfCanadaEligible",
    "hybridCanada",
    "onsiteCanada",
    "permanentPreferred",
  ] as const) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== "boolean") return null;
      patch[key] = b[key] as boolean;
    }
  }
  for (const key of ["relocationCountries", "preferredCountries"] as const) {
    if (b[key] !== undefined) {
      const arr = stringArray(b[key]);
      if (!arr) return null;
      patch[key] = arr;
    }
  }
  if (b.employmentTypes !== undefined) {
    if (
      !Array.isArray(b.employmentTypes) ||
      b.employmentTypes.some(
        (t) => !EMPLOYMENT_TYPES.includes(t as JobEmploymentType)
      )
    ) {
      return null;
    }
    patch.employmentTypes = b.employmentTypes as JobEmploymentType[];
  }
  if (b.maxJobAgeDays !== undefined) {
    const n = Number(b.maxJobAgeDays);
    if (!Number.isInteger(n) || n < 1 || n > 7) return null; // 7-day rule is a hard cap
    patch.maxJobAgeDays = n;
  }
  if (b.minimumMatchScore !== undefined) {
    const n = Number(b.minimumMatchScore);
    if (!Number.isInteger(n) || n < 0 || n > 100) return null;
    patch.minimumMatchScore = n;
  }
  if (b.preferredWorkplaceOrder !== undefined) {
    if (
      !Array.isArray(b.preferredWorkplaceOrder) ||
      b.preferredWorkplaceOrder.some(
        (k) => !WORKPLACE_ZONE_KEYS.includes(k as WorkplaceZoneKey)
      )
    ) {
      return null;
    }
    patch.preferredWorkplaceOrder =
      b.preferredWorkplaceOrder as WorkplaceZoneKey[];
  }

  return patch;
}
