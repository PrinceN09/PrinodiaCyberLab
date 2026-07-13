import { describe, expect, it } from "vitest";
import {
  computeAttention,
  needsAttention,
  topAttention,
  type AttentionSnapshot,
} from "@/lib/applications/attention";

const NOW = new Date("2026-07-11T12:00:00Z");

function days(n: number): Date {
  return new Date(NOW.getTime() + n * 86_400_000);
}

const base: AttentionSnapshot = {
  status: "APPLIED",
  followUpDate: null,
  followUpCompleted: false,
  lastActivityAt: NOW,
  interviews: [],
  assessments: [],
  offer: null,
};

const kinds = (snap: Partial<AttentionSnapshot>) =>
  computeAttention({ ...base, ...snap }, NOW).map((f) => f.kind);

describe("follow-up attention", () => {
  it("flags an overdue follow-up", () => {
    expect(kinds({ followUpDate: days(-1) })).toContain("FOLLOW_UP_OVERDUE");
  });
  it("flags a follow-up due today", () => {
    expect(kinds({ followUpDate: days(0) })).toContain("FOLLOW_UP_DUE_TODAY");
  });
  it("does not flag an upcoming follow-up as due/overdue", () => {
    const k = kinds({ followUpDate: days(3) });
    expect(k).not.toContain("FOLLOW_UP_OVERDUE");
    expect(k).not.toContain("FOLLOW_UP_DUE_TODAY");
  });
  it("a completed follow-up is removed from attention", () => {
    expect(kinds({ followUpDate: days(-1), followUpCompleted: true })).not.toContain(
      "FOLLOW_UP_OVERDUE"
    );
  });
});

describe("interview attention", () => {
  it("flags an interview today", () => {
    expect(
      kinds({ interviews: [{ status: "SCHEDULED", when: days(0) }] })
    ).toContain("INTERVIEW_TODAY");
  });
  it("flags an interview tomorrow", () => {
    expect(
      kinds({ interviews: [{ status: "SCHEDULED", when: days(1) }] })
    ).toContain("INTERVIEW_TOMORROW");
  });
  it("ignores completed interviews", () => {
    expect(
      kinds({ interviews: [{ status: "COMPLETED", when: days(0) }] })
    ).not.toContain("INTERVIEW_TODAY");
  });
});

describe("assessment attention", () => {
  it("flags an assessment due soon", () => {
    expect(
      kinds({ assessments: [{ status: "IN_PROGRESS", dueDate: days(1) }] })
    ).toContain("ASSESSMENT_DUE_SOON");
  });
  it("flags an overdue assessment", () => {
    expect(
      kinds({ assessments: [{ status: "NOT_STARTED", dueDate: days(-1) }] })
    ).toContain("ASSESSMENT_OVERDUE");
  });
  it("ignores submitted assessments", () => {
    expect(
      kinds({ assessments: [{ status: "SUBMITTED", dueDate: days(-1) }] })
    ).not.toContain("ASSESSMENT_OVERDUE");
  });
});

describe("offer attention", () => {
  it("flags an expiring offer", () => {
    expect(
      kinds({ status: "OFFER", offer: { decision: "PENDING", expiryDate: days(2) } })
    ).toContain("OFFER_EXPIRING");
  });
  it("does not flag an accepted offer", () => {
    expect(
      kinds({ status: "OFFER", offer: { decision: "ACCEPTED", expiryDate: days(2) } })
    ).not.toContain("OFFER_EXPIRING");
  });
});

describe("inactivity attention", () => {
  it("flags no activity for 7 days", () => {
    expect(kinds({ lastActivityAt: days(-8) })).toContain("NO_ACTIVITY_7_DAYS");
  });
  it("flags no activity for 14 days (supersedes 7)", () => {
    const k = kinds({ lastActivityAt: days(-15) });
    expect(k).toContain("NO_ACTIVITY_14_DAYS");
    expect(k).not.toContain("NO_ACTIVITY_7_DAYS");
  });
});

describe("terminal + helpers", () => {
  it("closed applications never raise attention", () => {
    expect(
      computeAttention(
        { ...base, status: "REJECTED", followUpDate: days(-5), lastActivityAt: days(-30) },
        NOW
      )
    ).toEqual([]);
  });
  it("topAttention returns the most severe flag", () => {
    const flags = computeAttention(
      {
        ...base,
        followUpDate: days(-1), // critical
        lastActivityAt: days(-8), // info
      },
      NOW
    );
    expect(topAttention(flags)?.kind).toBe("FOLLOW_UP_OVERDUE");
  });
  it("needsAttention reflects presence of flags", () => {
    expect(needsAttention({ ...base, followUpDate: days(-1) }, NOW)).toBe(true);
    expect(needsAttention(base, NOW)).toBe(false);
  });
});
