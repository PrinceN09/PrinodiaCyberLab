/**
 * Preference persistence. Loading always returns a complete
 * JobPreferences object: stored record merged over safe defaults.
 * Strictly user-scoped — every query filters by userId.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_JOB_PREFERENCES,
  defaultJobPreferences,
  WORKPLACE_ZONE_KEYS,
  type JobPreferences,
  type WorkplaceZoneKey,
} from "./preferences";

function parseZoneOrder(value: Prisma.JsonValue | null): WorkplaceZoneKey[] {
  if (!Array.isArray(value)) return DEFAULT_JOB_PREFERENCES.preferredWorkplaceOrder;
  const valid = value.filter((v): v is WorkplaceZoneKey =>
    WORKPLACE_ZONE_KEYS.includes(v as WorkplaceZoneKey)
  );
  return valid.length > 0
    ? valid
    : DEFAULT_JOB_PREFERENCES.preferredWorkplaceOrder;
}

export async function getJobPreferences(
  userId: string
): Promise<JobPreferences> {
  const record = await prisma.jobSearchPreference.findUnique({
    where: { userId },
  });
  if (!record) return defaultJobPreferences();

  return {
    homeCity: record.homeCity,
    homeProvince: record.homeProvince,
    homeCountry: record.homeCountry,
    willingToRelocate: record.willingToRelocate,
    relocationCountries: record.relocationCountries,
    preferredCountries: record.preferredCountries,
    remoteCanada: record.remoteCanada,
    remoteUSIfCanadaEligible: record.remoteUSIfCanadaEligible,
    hybridCanada: record.hybridCanada,
    onsiteCanada: record.onsiteCanada,
    employmentTypes:
      record.employmentTypes.length > 0
        ? record.employmentTypes
        : DEFAULT_JOB_PREFERENCES.employmentTypes,
    permanentPreferred: record.permanentPreferred,
    maxJobAgeDays: record.maxJobAgeDays,
    minimumMatchScore: record.minimumMatchScore,
    preferredWorkplaceOrder: parseZoneOrder(record.preferredWorkplaceOrder),
  };
}

export async function updateJobPreferences(
  userId: string,
  patch: Partial<JobPreferences>
): Promise<JobPreferences> {
  const { preferredWorkplaceOrder, ...scalars } = patch;
  await prisma.jobSearchPreference.upsert({
    where: { userId },
    update: {
      ...scalars,
      ...(preferredWorkplaceOrder !== undefined && {
        preferredWorkplaceOrder,
      }),
    },
    create: {
      userId,
      ...scalars,
      ...(preferredWorkplaceOrder !== undefined && {
        preferredWorkplaceOrder,
      }),
    },
  });
  return getJobPreferences(userId);
}
