import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertReopen,
  assertTransition,
  canTransition,
  reopenTargets,
} from "@/lib/applications/transitions";
import { ACTIVE_STATUSES } from "@/lib/applications/status";

describe("status transition graph — happy path", () => {
  it("Saved → Preparing allowed", () => {
    expect(canTransition("SAVED", "PREPARING")).toBe(true);
  });
  it("Preparing → Ready to Apply allowed", () => {
    expect(canTransition("PREPARING", "READY_TO_APPLY")).toBe(true);
  });
  it("Ready to Apply → Applied allowed", () => {
    expect(canTransition("READY_TO_APPLY", "APPLIED")).toBe(true);
  });
  it("Applied → Interview allowed (realistic skip)", () => {
    expect(canTransition("APPLIED", "INTERVIEW")).toBe(true);
  });
  it("Recruiter Contact → Interview allowed", () => {
    expect(canTransition("RECRUITER_CONTACT", "INTERVIEW")).toBe(true);
  });
  it("Interview → Offer allowed", () => {
    expect(canTransition("INTERVIEW", "OFFER")).toBe(true);
  });
  it("Final Interview → Offer allowed", () => {
    expect(canTransition("FINAL_INTERVIEW", "OFFER")).toBe(true);
  });
});

describe("closing transitions", () => {
  it("Applied → Rejected allowed", () => {
    expect(canTransition("APPLIED", "REJECTED")).toBe(true);
  });
  it("Interview → Rejected allowed", () => {
    expect(canTransition("INTERVIEW", "REJECTED")).toBe(true);
  });
  it("any active state → Withdrawn allowed", () => {
    for (const s of ACTIVE_STATUSES) {
      expect(canTransition(s, "WITHDRAWN")).toBe(true);
    }
  });
  it("active → Archived allowed", () => {
    expect(canTransition("SAVED", "ARCHIVED")).toBe(true);
  });
});

describe("closed states are sticky without reopen", () => {
  it("Rejected → Applied rejected without reopen", () => {
    const r = assertTransition("REJECTED", "APPLIED");
    expect(r.ok).toBe(false);
  });
  it("Offer → Preparing rejected without reopen", () => {
    const r = assertTransition("OFFER", "PREPARING");
    expect(r.ok).toBe(false);
    expect(canTransition("OFFER", "PREPARING")).toBe(false);
  });
  it("closed state cannot jump straight to an active stage", () => {
    expect(assertTransition("WITHDRAWN", "PREPARING").ok).toBe(false);
  });
  it("Rejected has no normal outgoing transitions", () => {
    expect(allowedTransitions("REJECTED")).toEqual([]);
  });
});

describe("reopen", () => {
  it("explicit reopen works from a closed state", () => {
    const r = assertReopen("REJECTED", "APPLIED");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.to).toBe("APPLIED");
  });
  it("reopen defaults to SAVED", () => {
    const r = assertReopen("ARCHIVED");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.to).toBe("SAVED");
  });
  it("cannot reopen an active application", () => {
    expect(assertReopen("APPLIED", "SAVED").ok).toBe(false);
  });
  it("cannot reopen into a terminal state", () => {
    expect(assertReopen("REJECTED", "ARCHIVED").ok).toBe(false);
  });
  it("reopen targets are all active statuses", () => {
    expect(reopenTargets()).toEqual([...ACTIVE_STATUSES]);
  });
});

describe("assertTransition edge cases", () => {
  it("rejects same-status no-op", () => {
    expect(assertTransition("APPLIED", "APPLIED").ok).toBe(false);
  });
  it("rejects unknown statuses", () => {
    expect(assertTransition("APPLIED", "NONSENSE").ok).toBe(false);
    expect(assertTransition("NONSENSE", "APPLIED").ok).toBe(false);
  });
  it("early-stage backward correction is allowed (Preparing → Saved)", () => {
    expect(canTransition("PREPARING", "SAVED")).toBe(true);
  });
});
