import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * DB-backed preference loading. The prisma client is mocked so these
 * tests are pure and need no database. They assert: strict per-user
 * scoping (no cross-user leakage), stored records merged over safe
 * defaults, and partial/invalid fields falling back to defaults.
 */

const findUnique = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobSearchPreference: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      upsert: (...args: unknown[]) => upsert(...args),
    },
  },
}));

import { getJobPreferences, updateJobPreferences } from "@/lib/jobs/preferences-service";
import { DEFAULT_JOB_PREFERENCES } from "@/lib/jobs/preferences";

/** A complete stored record (all columns present). */
function record(userId: string, over: Record<string, unknown> = {}) {
  return {
    id: `pref-${userId}`,
    userId,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
});

describe("getJobPreferences — user-scoped loading", () => {
  it("queries strictly by the authenticated userId", async () => {
    findUnique.mockResolvedValue(record("user-a"));
    await getJobPreferences("user-a");
    expect(findUnique).toHaveBeenCalledWith({ where: { userId: "user-a" } });
  });

  it("returns safe defaults when the user has no stored record", async () => {
    findUnique.mockResolvedValue(null);
    const prefs = await getJobPreferences("user-new");
    expect(prefs).toEqual(DEFAULT_JOB_PREFERENCES);
  });

  it("returns an isolated defaults copy — mutating it never leaks", async () => {
    findUnique.mockResolvedValue(null);
    const prefs = await getJobPreferences("user-new");
    prefs.willingToRelocate = false;
    prefs.relocationCountries.push("United States");
    expect(DEFAULT_JOB_PREFERENCES.willingToRelocate).toBe(true);
    expect(DEFAULT_JOB_PREFERENCES.relocationCountries).toEqual(["Canada"]);
  });

  it("loads a stored record over defaults", async () => {
    findUnique.mockResolvedValue(
      record("user-a", {
        homeCity: "Toronto",
        homeProvince: "ON",
        willingToRelocate: false,
        remoteUSIfCanadaEligible: false,
        maxJobAgeDays: 3,
        minimumMatchScore: 65,
      })
    );
    const prefs = await getJobPreferences("user-a");
    expect(prefs.homeCity).toBe("Toronto");
    expect(prefs.homeProvince).toBe("ON");
    expect(prefs.willingToRelocate).toBe(false);
    expect(prefs.remoteUSIfCanadaEligible).toBe(false);
    expect(prefs.maxJobAgeDays).toBe(3);
    expect(prefs.minimumMatchScore).toBe(65);
  });

  it("no cross-user leakage: each user gets only their own record", async () => {
    findUnique.mockImplementation(({ where }: { where: { userId: string } }) =>
      Promise.resolve(
        where.userId === "user-a"
          ? record("user-a", { homeCity: "Calgary" })
          : record("user-b", { homeCity: "Halifax" })
      )
    );
    const a = await getJobPreferences("user-a");
    const b = await getJobPreferences("user-b");
    expect(a.homeCity).toBe("Calgary");
    expect(b.homeCity).toBe("Halifax");
  });

  it("falls back to default employmentTypes / workplace order for empty stored arrays", async () => {
    findUnique.mockResolvedValue(
      record("user-a", { employmentTypes: [], preferredWorkplaceOrder: [] })
    );
    const prefs = await getJobPreferences("user-a");
    expect(prefs.employmentTypes).toEqual(DEFAULT_JOB_PREFERENCES.employmentTypes);
    expect(prefs.preferredWorkplaceOrder).toEqual(
      DEFAULT_JOB_PREFERENCES.preferredWorkplaceOrder
    );
  });

  it("ignores invalid workplace-order entries, keeping only valid keys", async () => {
    findUnique.mockResolvedValue(
      record("user-a", { preferredWorkplaceOrder: ["REMOTE_CANADA", "MARS", "BC"] })
    );
    const prefs = await getJobPreferences("user-a");
    expect(prefs.preferredWorkplaceOrder).toEqual(["REMOTE_CANADA", "BC"]);
  });
});

describe("updateJobPreferences — user-scoped upsert", () => {
  it("upserts against the authenticated userId and reloads that user", async () => {
    upsert.mockResolvedValue(undefined);
    findUnique.mockResolvedValue(record("user-a", { maxJobAgeDays: 5 }));

    const prefs = await updateJobPreferences("user-a", { maxJobAgeDays: 5 });

    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0] as {
      where: { userId: string };
      create: { userId: string };
    };
    expect(arg.where).toEqual({ userId: "user-a" });
    expect(arg.create.userId).toBe("user-a");
    // Reload is user-scoped too.
    expect(findUnique).toHaveBeenCalledWith({ where: { userId: "user-a" } });
    expect(prefs.maxJobAgeDays).toBe(5);
  });
});
