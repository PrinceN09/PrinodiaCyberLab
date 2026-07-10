/**
 * Provider registry. Concrete providers are added in Phase 2:
 *
 *   greenhouse.ts      — official public board API (per-company slug)
 *   lever.ts           — official postings API (per-company slug)
 *   ashby.ts           — official public job-board API
 *   smartrecruiters.ts — official public postings API
 *   jobbank.ts         — Government of Canada Job Bank RSS (no official
 *                        API; documented limitation)
 *   hiringcafe.ts      — EXPERIMENTAL: unofficial endpoint, disabled by
 *                        default; enable only via HIRING_CAFE_ENABLED=true
 *   workday.ts         — EXPERIMENTAL: unofficial per-tenant endpoint
 *
 * The pipeline never talks to a provider directly — always through
 * this registry — so a provider can be replaced or removed without
 * touching the dashboard or the application tracker.
 */
import type { JobSourceType } from "@prisma/client";
import type { JobSourceProvider } from "./types";

const providers = new Map<JobSourceType, JobSourceProvider>();

export function registerProvider(provider: JobSourceProvider) {
  providers.set(provider.sourceType, provider);
}

export function getProvider(sourceType: JobSourceType): JobSourceProvider | null {
  return providers.get(sourceType) ?? null;
}

export function listProviders(): JobSourceProvider[] {
  return [...providers.values()];
}

/**
 * Central kill-switch for unofficial providers: even when registered
 * and configured, they only run when explicitly enabled via env.
 */
export function isProviderAllowed(provider: JobSourceProvider): boolean {
  if (provider.official) return true;
  switch (provider.sourceType) {
    case "HIRING_CAFE":
      return process.env.HIRING_CAFE_ENABLED === "true";
    case "WORKDAY":
      return process.env.WORKDAY_ENABLED === "true";
    default:
      return false;
  }
}
