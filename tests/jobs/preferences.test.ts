import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_JOB_PREFERENCES,
  defaultJobPreferences,
  validatePreferencePatch,
} from "@/lib/jobs/preferences";
import {
  checkRecomputeCooldown,
  RECOMPUTE_COOLDOWN_MS,
  resetRecomputeCooldowns,
} from "@/lib/jobs/recompute-guard";

describe("preference defaults (documented job-search profile)", () => {
  it("matches the specified defaults exactly", () => {
    expect(DEFAULT_JOB_PREFERENCES).toEqual({
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
    });
  });

  it("returns isolated copies — no shared state between loads (leakage guard)", () => {
    const a = defaultJobPreferences();
    const b = defaultJobPreferences();
    a.relocationCountries.push("United States");
    a.willingToRelocate = false;
    expect(b.relocationCountries).toEqual(["Canada"]);
    expect(b.willingToRelocate).toBe(true);
    expect(DEFAULT_JOB_PREFERENCES.relocationCountries).toEqual(["Canada"]);
  });
});

describe("preference patch validation", () => {
  it("accepts a valid partial update", () => {
    const patch = validatePreferencePatch({
      willingToRelocate: false,
      maxJobAgeDays: 3,
      employmentTypes: ["FULL_TIME", "CONTRACT"],
      preferredWorkplaceOrder: ["REMOTE_CANADA", "BC"],
    });
    expect(patch).toEqual({
      willingToRelocate: false,
      maxJobAgeDays: 3,
      employmentTypes: ["FULL_TIME", "CONTRACT"],
      preferredWorkplaceOrder: ["REMOTE_CANADA", "BC"],
    });
  });

  it("rejects wrong types", () => {
    expect(validatePreferencePatch({ willingToRelocate: "yes" })).toBeNull();
    expect(validatePreferencePatch({ employmentTypes: ["FREELANCE"] })).toBeNull();
    expect(validatePreferencePatch({ relocationCountries: [42] })).toBeNull();
    expect(validatePreferencePatch({ preferredWorkplaceOrder: ["MARS"] })).toBeNull();
    expect(validatePreferencePatch(null)).toBeNull();
  });

  it("enforces the 7-day hard cap on maxJobAgeDays", () => {
    expect(validatePreferencePatch({ maxJobAgeDays: 10 })).toBeNull();
    expect(validatePreferencePatch({ maxJobAgeDays: 0 })).toBeNull();
    expect(validatePreferencePatch({ maxJobAgeDays: 7 })).toEqual({
      maxJobAgeDays: 7,
    });
  });

  it("bounds minimumMatchScore to 0–100", () => {
    expect(validatePreferencePatch({ minimumMatchScore: 101 })).toBeNull();
    expect(validatePreferencePatch({ minimumMatchScore: 80 })).toEqual({
      minimumMatchScore: 80,
    });
  });
});

describe("recompute cooldown guard", () => {
  beforeEach(() => resetRecomputeCooldowns());

  it("allows the first request and blocks an immediate repeat", () => {
    const t = 1_000_000;
    expect(checkRecomputeCooldown("user-a", t)).toEqual({ allowed: true });
    const second = checkRecomputeCooldown("user-a", t + 5_000);
    expect(second.allowed).toBe(false);
    if (!second.allowed) {
      expect(second.retryAfterSeconds).toBeGreaterThan(0);
      expect(second.retryAfterSeconds).toBeLessThanOrEqual(
        RECOMPUTE_COOLDOWN_MS / 1000
      );
    }
  });

  it("allows again after the cooldown window", () => {
    const t = 1_000_000;
    checkRecomputeCooldown("user-a", t);
    expect(
      checkRecomputeCooldown("user-a", t + RECOMPUTE_COOLDOWN_MS + 1)
    ).toEqual({ allowed: true });
  });

  it("is scoped per user — one user cannot exhaust another's budget", () => {
    const t = 1_000_000;
    checkRecomputeCooldown("user-a", t);
    expect(checkRecomputeCooldown("user-b", t + 1)).toEqual({ allowed: true });
  });
});
