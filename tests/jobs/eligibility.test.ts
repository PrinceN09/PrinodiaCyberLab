import { describe, expect, it } from "vitest";
import {
  detectCitizenshipRequirement,
  detectSecurityClearance,
  detectUSResidencyRequirement,
  evaluateEligibility,
  isWithinAgeWindow,
  locationPriority,
  shouldArchive,
} from "@/lib/jobs/eligibility";

const NOW = new Date("2026-07-10T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

type TestJob = {
  title: string;
  company: string;
  sourceUrl: string;
  description: string;
  employmentType: "FULL_TIME" | "INTERNSHIP" | "TEMPORARY" | "COMMISSION";
  workplaceType: "REMOTE" | "HYBRID" | "ON_SITE" | "UNKNOWN";
  requiresUSResidency: boolean;
  requiresCitizenship: boolean;
  requiresSecurityClearance: boolean;
  acceptsCanadianApplicants: boolean;
  sourcePostedAt: Date | null;
  city: string | null;
  province: string | null;
  country: string | null;
};

const baseJob: TestJob = {
  title: "SOC Analyst",
  company: "Acme Security",
  sourceUrl: "https://boards.example.com/acme/1",
  description: "Monitor SIEM alerts and triage incidents.",
  employmentType: "FULL_TIME",
  workplaceType: "ON_SITE",
  requiresUSResidency: false,
  requiresCitizenship: false,
  requiresSecurityClearance: false,
  acceptsCanadianApplicants: true,
  sourcePostedAt: daysAgo(2),
  city: "Vancouver",
  province: "BC",
  country: "Canada",
};

describe("seven-day posting filter", () => {
  it("accepts a job posted 2 days ago", () => {
    expect(isWithinAgeWindow(daysAgo(2), daysAgo(1), NOW)).toBe(true);
  });

  it("accepts a job posted exactly 7 days ago", () => {
    expect(isWithinAgeWindow(daysAgo(7), daysAgo(1), NOW)).toBe(true);
  });

  it("rejects a job posted 8 days ago even if imported today", () => {
    // spec: never rely on the import date alone
    expect(isWithinAgeWindow(daysAgo(8), daysAgo(0), NOW)).toBe(false);
  });

  it("falls back to firstSeenAt when the source has no posting date", () => {
    expect(isWithinAgeWindow(null, daysAgo(3), NOW)).toBe(true);
    expect(isWithinAgeWindow(null, daysAgo(10), NOW)).toBe(false);
  });
});

describe("US-only exclusion", () => {
  it("detects 'must reside in the United States'", () => {
    expect(
      detectUSResidencyRequirement("Applicants must reside in the United States.")
    ).toBe(true);
  });

  it("detects 'US-based only'", () => {
    expect(detectUSResidencyRequirement("This role is US-based only.")).toBe(true);
  });

  it("does not flag roles open to Canada and the US", () => {
    expect(
      detectUSResidencyRequirement(
        "Remote — open to candidates in Canada and the US."
      )
    ).toBe(false);
  });

  it("marks US-residency jobs ineligible regardless of other factors", () => {
    const verdict = evaluateEligibility(
      { ...baseJob, requiresUSResidency: true },
      { now: NOW, firstSeenAt: daysAgo(1) }
    );
    expect(verdict.eligible).toBe(false);
    expect(verdict.locationPriority).toBe(99);
    expect(verdict.reasons).toContain("Requires US residency");
  });
});

describe("citizenship & clearance detection", () => {
  it("detects US citizenship requirements", () => {
    expect(
      detectCitizenshipRequirement("US citizenship required for this position")
    ).toBe(true);
    expect(detectCitizenshipRequirement("Must be a U.S. citizen")).toBe(true);
    expect(detectCitizenshipRequirement("Eligible to work in Canada")).toBe(false);
  });

  it("detects security clearance requirements", () => {
    expect(detectSecurityClearance("Active TS/SCI clearance needed")).toBe(true);
    expect(detectSecurityClearance("Security clearance required")).toBe(true);
    expect(detectSecurityClearance("No clearance needed")).toBe(false);
  });
});

describe("location prioritization (1–7)", () => {
  const loc = (over: Partial<TestJob>) =>
    locationPriority({ ...baseJob, ...over });

  it("1: Vancouver, BC", () => {
    expect(loc({})).toBe(1);
  });

  it("2: Metro Vancouver (Burnaby)", () => {
    expect(loc({ city: "Burnaby" })).toBe(2);
  });

  it("3: elsewhere in BC (Victoria)", () => {
    expect(loc({ city: "Victoria" })).toBe(3);
  });

  it("4: remote within Canada", () => {
    expect(
      loc({ city: null, province: null, workplaceType: "REMOTE" })
    ).toBe(4);
  });

  it("5: on-site elsewhere in Canada (Toronto)", () => {
    expect(loc({ city: "Toronto", province: "ON" })).toBe(5);
  });

  it("6: remote open to Canada and the US", () => {
    expect(
      loc({
        city: null,
        province: null,
        country: null,
        workplaceType: "REMOTE",
        description: "Fully remote, open to candidates in Canada and the US.",
      })
    ).toBe(6);
  });

  it("7: US remote explicitly accepting Canadian applicants", () => {
    expect(
      loc({
        city: null,
        province: null,
        country: "United States",
        workplaceType: "REMOTE",
        description: "US remote; we also accept applicants located in Canada.",
      })
    ).toBe(7);
  });

  it("99: unknown-location remote with no Canada signal", () => {
    expect(
      loc({
        city: null,
        province: null,
        country: null,
        workplaceType: "REMOTE",
        description: "Work from anywhere in the EU.",
      })
    ).toBe(99);
  });
});

describe("default exclusions", () => {
  const verdictFor = (over: Partial<TestJob>) =>
    evaluateEligibility(
      { ...baseJob, ...over },
      { now: NOW, firstSeenAt: daysAgo(1) }
    );

  it("accepts the happy-path Vancouver full-time job", () => {
    const v = verdictFor({});
    expect(v.eligible).toBe(true);
    expect(v.locationPriority).toBe(1);
    expect(v.reasons).toHaveLength(0);
  });

  it("excludes internships", () => {
    expect(verdictFor({ employmentType: "INTERNSHIP" }).reasons).toContain(
      "Internship"
    );
  });

  it("excludes temporary roles", () => {
    expect(verdictFor({ employmentType: "TEMPORARY" }).eligible).toBe(false);
  });

  it("excludes commission-only roles", () => {
    expect(verdictFor({ employmentType: "COMMISSION" }).eligible).toBe(false);
  });

  it("excludes unpaid positions", () => {
    expect(
      verdictFor({ description: "This is an unpaid volunteer role." }).eligible
    ).toBe(false);
  });

  it("excludes incomplete postings", () => {
    expect(verdictFor({ title: " " }).eligible).toBe(false);
  });

  it("excludes stale postings", () => {
    expect(verdictFor({ sourcePostedAt: daysAgo(9) }).eligible).toBe(false);
  });
});

describe("expiration, archival, and saved-job retention", () => {
  it("archives unsaved jobs older than 7 days", () => {
    expect(
      shouldArchive(
        { sourcePostedAt: daysAgo(9), firstSeenAt: daysAgo(9) },
        false,
        NOW
      )
    ).toBe(true);
  });

  it("keeps fresh jobs active", () => {
    expect(
      shouldArchive(
        { sourcePostedAt: daysAgo(3), firstSeenAt: daysAgo(3) },
        false,
        NOW
      )
    ).toBe(false);
  });

  it("retains saved/applied jobs past the window (spec requirement)", () => {
    expect(
      shouldArchive(
        { sourcePostedAt: daysAgo(30), firstSeenAt: daysAgo(30) },
        true,
        NOW
      )
    ).toBe(false);
  });
});
