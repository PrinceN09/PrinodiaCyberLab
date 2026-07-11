import { describe, expect, it } from "vitest";
import {
  buildJobOrderBy,
  buildJobWhere,
  canUnsave,
  DISCOVERABLE_WHERE,
  formatPostingAge,
  formatSalary,
  locationPriorityLabel,
  parseJobQuery,
  postingAgeDays,
} from "@/lib/jobs/discovery";

const params = (o: Record<string, string>) => new URLSearchParams(o);
const NOW = new Date("2026-07-10T12:00:00Z");

describe("parseJobQuery — validation of untrusted params", () => {
  it("returns safe defaults for empty params", () => {
    const q = parseJobQuery(params({}));
    expect(q).toMatchObject({
      q: "",
      workplace: null,
      employment: null,
      seniority: null,
      province: null,
      source: null,
      salaryMin: null,
      postedWithinDays: 7,
      sort: "match",
      page: 1,
      pageSize: 20,
    });
  });

  it("whitelists enum values and rejects garbage", () => {
    const q = parseJobQuery(
      params({
        workplace: "REMOTE",
        employment: "DROP TABLE",
        seniority: "ENTRY",
        province: "XX",
        source: "GREENHOUSE",
        sort: "__proto__",
      })
    );
    expect(q.workplace).toBe("REMOTE");
    expect(q.employment).toBeNull();
    expect(q.seniority).toBe("ENTRY");
    expect(q.province).toBeNull();
    expect(q.source).toBe("GREENHOUSE");
    expect(q.sort).toBe("match");
  });

  it("clamps numerics: page, pageSize, days, salary", () => {
    const q = parseJobQuery(
      params({ page: "-5", pageSize: "9999", days: "60", salaryMin: "-100" })
    );
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(50);
    expect(q.postedWithinDays).toBe(7); // never wider than the 7-day rule
    expect(q.salaryMin).toBeNull();
  });

  it("truncates absurdly long keywords", () => {
    const q = parseJobQuery(params({ q: "x".repeat(500) }));
    expect(q.q).toHaveLength(120);
  });
});

describe("buildJobWhere — mandatory eligibility filter", () => {
  it("always spreads DISCOVERABLE_WHERE", () => {
    const where = buildJobWhere(parseJobQuery(params({})), NOW);
    for (const [key, value] of Object.entries(DISCOVERABLE_WHERE)) {
      expect(where[key as keyof typeof where]).toEqual(value);
    }
  });

  it("keeps the eligibility filter even with hostile-looking params", () => {
    const where = buildJobWhere(
      parseJobQuery(params({ q: "isActive:false", days: "9999" })),
      NOW
    );
    expect(where.isActive).toBe(true);
    expect(where.locationPriority).toEqual({ lt: 99 });
    expect(where.requiresUSResidency).toBe(false);
  });

  it("applies the age window with firstSeenAt fallback", () => {
    const where = buildJobWhere(parseJobQuery(params({ days: "3" })), NOW);
    const ageClause = (where.AND as { OR?: unknown }[])[0];
    const cutoff = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(ageClause).toEqual({
      OR: [
        { sourcePostedAt: { gte: cutoff } },
        { sourcePostedAt: null, firstSeenAt: { gte: cutoff } },
      ],
    });
  });

  it("adds keyword and facet filters only when present", () => {
    const bare = buildJobWhere(parseJobQuery(params({})), NOW);
    expect((bare.AND as unknown[]).length).toBe(1); // age window only

    const filtered = buildJobWhere(
      parseJobQuery(
        params({ q: "soc", workplace: "REMOTE", province: "BC", salaryMin: "70000" })
      ),
      NOW
    );
    expect((filtered.AND as unknown[]).length).toBe(5);
  });
});

describe("buildJobOrderBy — sorting", () => {
  it("match sort ranks matchScore first, nulls last", () => {
    expect(buildJobOrderBy("match")[0]).toEqual({
      matchScore: { sort: "desc", nulls: "last" },
    });
  });
  it("gaps sort ranks fewest missing required skills first", () => {
    expect(buildJobOrderBy("gaps")[0]).toEqual({
      missingSkillCount: { sort: "asc", nulls: "last" },
    });
  });
  it("priority sort ranks location first", () => {
    expect(buildJobOrderBy("priority")[0]).toEqual({ locationPriority: "asc" });
  });
  it("recent sort ranks posting date first, nulls last", () => {
    expect(buildJobOrderBy("recent")[0]).toEqual({
      sourcePostedAt: { sort: "desc", nulls: "last" },
    });
  });
  it("salary sort ranks salaryMax first", () => {
    expect(buildJobOrderBy("salary")[0]).toEqual({
      salaryMax: { sort: "desc", nulls: "last" },
    });
  });
});

describe("canUnsave — tracking history protection", () => {
  it("allows unsaving DISCOVERED and SAVED", () => {
    expect(canUnsave("DISCOVERED")).toBe(true);
    expect(canUnsave("SAVED")).toBe(true);
  });
  it("blocks unsaving anything that has progressed", () => {
    for (const s of [
      "PREPARING",
      "APPLIED",
      "INTERVIEW",
      "OFFER",
      "REJECTED",
      "WITHDRAWN",
      "ARCHIVED",
    ] as const) {
      expect(canUnsave(s)).toBe(false);
    }
  });
});

describe("display helpers", () => {
  it("computes posting age from the original date, not first-seen", () => {
    expect(
      postingAgeDays("2026-07-08T12:00:00Z", "2026-07-10T00:00:00Z", NOW)
    ).toBe(2);
  });
  it("falls back to firstSeenAt when the source has no date", () => {
    expect(postingAgeDays(null, "2026-07-09T12:00:00Z", NOW)).toBe(1);
  });
  it("formats ages", () => {
    expect(formatPostingAge(0)).toBe("Today");
    expect(formatPostingAge(1)).toBe("Yesterday");
    expect(formatPostingAge(6)).toBe("6d ago");
  });
  it("formats salary ranges", () => {
    expect(formatSalary(70000, 90000, "CAD", "YEAR")).toBe("CAD 70k–90k/yr");
    expect(formatSalary(null, 45, "CAD", "HOUR")).toBe("CAD 45/hr");
    expect(formatSalary(null, null, null, null)).toBeNull();
  });
  it("labels location priorities", () => {
    expect(locationPriorityLabel(1)).toBe("Vancouver, BC");
    expect(locationPriorityLabel(4)).toBe("Remote — Canada");
    expect(locationPriorityLabel(42)).toBe("Eligibility unclear");
  });
});
