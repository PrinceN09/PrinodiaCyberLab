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
import {
  defaultJobPreferences,
  type JobPreferences,
} from "@/lib/jobs/preferences";

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

describe("location prioritization (Canada-wide relocation profile)", () => {
  const loc = (over: Partial<TestJob>, prefs?: JobPreferences) =>
    locationPriority({ ...baseJob, ...over }, prefs);

  it("1: remote anywhere in Canada is the top priority", () => {
    expect(
      loc({ city: null, province: null, workplaceType: "REMOTE" })
    ).toBe(1);
    expect(loc({ city: "Toronto", province: "ON", workplaceType: "REMOTE" })).toBe(1);
  });

  it("2: remote explicitly open to both Canada and the US", () => {
    expect(
      loc({
        city: null,
        province: null,
        country: null,
        workplaceType: "REMOTE",
        description: "Fully remote, open to candidates in Canada and the US.",
      })
    ).toBe(2);
  });

  it("3: Vancouver and Metro Vancouver on-site/hybrid", () => {
    expect(loc({})).toBe(3); // Vancouver on-site
    expect(loc({ city: "Burnaby", workplaceType: "HYBRID" })).toBe(3);
  });

  it("4: elsewhere in BC hybrid/on-site (Victoria)", () => {
    expect(loc({ city: "Victoria" })).toBe(4);
  });

  it("5: Toronto on-site is visible via relocation", () => {
    expect(loc({ city: "Toronto", province: "ON" })).toBe(5);
  });

  it("5: Ottawa hybrid is visible via relocation", () => {
    expect(
      loc({ city: "Ottawa", province: "ON", workplaceType: "HYBRID" })
    ).toBe(5);
  });

  it("5: Canadian roles outside BC are never rejected for being outside Vancouver", () => {
    for (const [city, province] of [
      ["Montreal", "QC"],
      ["Calgary", "AB"],
      ["Halifax", "NS"],
      ["Winnipeg", "MB"],
    ] as const) {
      expect(loc({ city, province })).toBe(5);
    }
  });

  it("6: remote North America roles that explicitly include Canada", () => {
    expect(
      loc({
        city: null,
        province: null,
        country: null,
        workplaceType: "REMOTE",
        description: "Remote across North America. Canadian applicants welcome.",
      })
    ).toBe(6);
  });

  it("7: Canada mentioned but low-confidence → manual review", () => {
    expect(
      loc({
        city: null,
        province: null,
        country: null,
        workplaceType: "REMOTE",
        description: "Distributed team. We are Canadian-friendly.",
      })
    ).toBe(7);
  });

  it("99: North America remote WITHOUT explicit Canada is ambiguous", () => {
    expect(
      loc({
        city: null,
        province: null,
        country: null,
        workplaceType: "REMOTE",
        description: "Remote anywhere in North America.",
      })
    ).toBe(99);
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

describe("preference-driven location behavior", () => {
  const loc = (over: Partial<TestJob>, prefs: JobPreferences) =>
    locationPriority({ ...baseJob, ...over }, prefs);

  it("relocation disabled: rest-of-Canada on-site becomes ineligible, remote Canada unaffected", () => {
    const prefs = { ...defaultJobPreferences(), willingToRelocate: false };
    expect(loc({ city: "Toronto", province: "ON" }, prefs)).toBe(99);
    expect(loc({}, prefs)).toBe(3); // Vancouver stays
    expect(
      loc({ city: null, province: null, workplaceType: "REMOTE" }, prefs)
    ).toBe(1); // remote Canada stays
  });

  it("remote-US consent disabled: Canada+US remote becomes ineligible", () => {
    const prefs = {
      ...defaultJobPreferences(),
      remoteUSIfCanadaEligible: false,
    };
    expect(
      loc(
        {
          city: null,
          province: null,
          country: null,
          workplaceType: "REMOTE",
          description: "Remote, open to candidates in Canada and the US.",
        },
        prefs
      )
    ).toBe(99);
  });

  it("hybrid/on-site toggles gate those arrangements", () => {
    const noHybrid = { ...defaultJobPreferences(), hybridCanada: false };
    expect(loc({ workplaceType: "HYBRID" }, noHybrid)).toBe(99);
    const noOnsite = { ...defaultJobPreferences(), onsiteCanada: false };
    expect(loc({ workplaceType: "ON_SITE" }, noOnsite)).toBe(99);
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
    expect(v.locationPriority).toBe(3); // Vancouver on-site
    expect(v.reasons).toHaveLength(0);
  });

  it("accepts an on-site Toronto job (relocation enabled)", () => {
    const v = verdictFor({ city: "Toronto", province: "ON" });
    expect(v.eligible).toBe(true);
    expect(v.locationPriority).toBe(5);
  });

  it("excludes contract roles under the full-time-only default", () => {
    const v = verdictFor({ employmentType: "CONTRACT" as TestJob["employmentType"] });
    expect(v.eligible).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/contract/i);
  });

  it("marks ambiguous North America listings with an explicit reason", () => {
    const v = verdictFor({
      city: null,
      province: null,
      country: null,
      workplaceType: "REMOTE",
      description: "Remote anywhere in North America.",
    });
    expect(v.eligible).toBe(false);
    expect(v.locationPriority).toBe(99);
    expect(v.reasons.join(" ")).toMatch(/ambiguous/i);
  });

  it("narrows the age window when preferences ask for fresher jobs", () => {
    const prefs = { ...defaultJobPreferences(), maxJobAgeDays: 3 };
    const v = evaluateEligibility(
      { ...baseJob, sourcePostedAt: daysAgo(5) },
      { now: NOW, firstSeenAt: daysAgo(1), prefs }
    );
    expect(v.eligible).toBe(false);
    expect(v.reasons).toContain("Older than 3 days");
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
