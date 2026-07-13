import { describe, expect, it } from "vitest";
import {
  parseApplicationListQuery,
  validateApplicationUpdate,
  validateAssessmentInput,
  validateInterviewInput,
  validateManualApplication,
  validateNoteInput,
  validateOfferInput,
  validateTransition,
} from "@/lib/applications/validation";

function params(obj: Record<string, string>) {
  return new URLSearchParams(obj);
}

describe("manual application validation", () => {
  it("requires company and jobTitle", () => {
    expect(validateManualApplication({ company: "Acme" }).ok).toBe(false);
    expect(validateManualApplication({ jobTitle: "SOC Analyst" }).ok).toBe(false);
  });
  it("accepts a valid manual application", () => {
    const r = validateManualApplication({
      company: "Acme",
      jobTitle: "SOC Analyst",
      location: "Toronto",
      workplaceType: "HYBRID",
      url: "https://acme.example/jobs/1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.company).toBe("Acme");
      expect(r.value.workplaceType).toBe("HYBRID");
    }
  });
  it("rejects a bad URL and a bad enum", () => {
    expect(validateManualApplication({ company: "A", jobTitle: "B", url: "notaurl" }).ok).toBe(false);
    expect(
      validateManualApplication({ company: "A", jobTitle: "B", workplaceType: "MARS" }).ok
    ).toBe(false);
  });
});

describe("interview validation", () => {
  it("rejects end time before start time", () => {
    const r = validateInterviewInput({
      startTime: "2026-07-20T15:00:00Z",
      endTime: "2026-07-20T14:00:00Z",
    });
    expect(r.ok).toBe(false);
  });
  it("accepts end after start", () => {
    const r = validateInterviewInput({
      type: "TECHNICAL_INTERVIEW",
      startTime: "2026-07-20T14:00:00Z",
      endTime: "2026-07-20T15:00:00Z",
    });
    expect(r.ok).toBe(true);
  });
  it("rejects an invalid interview type", () => {
    expect(validateInterviewInput({ type: "COFFEE_CHAT" }).ok).toBe(false);
  });
});

describe("assessment validation", () => {
  it("requires a name on create", () => {
    expect(validateAssessmentInput({ type: "CODING_TEST" }).ok).toBe(false);
  });
  it("rejects a due date before the received date", () => {
    const r = validateAssessmentInput({
      name: "HackerRank",
      receivedAt: "2026-07-20T00:00:00Z",
      dueDate: "2026-07-18T00:00:00Z",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects an invalid due date string", () => {
    expect(validateAssessmentInput({ name: "X", dueDate: "not-a-date" }).ok).toBe(false);
  });
  it("accepts a valid assessment", () => {
    expect(
      validateAssessmentInput({ name: "SOC Lab", type: "CYBERSECURITY_LAB", status: "IN_PROGRESS" }).ok
    ).toBe(true);
  });
});

describe("offer validation", () => {
  it("rejects expiry before received", () => {
    const r = validateOfferInput({
      receivedDate: "2026-07-20T00:00:00Z",
      expiryDate: "2026-07-19T00:00:00Z",
    });
    expect(r.ok).toBe(false);
  });
  it("accepts a negotiating offer with salary", () => {
    const r = validateOfferInput({ baseSalary: 95000, decision: "NEGOTIATING" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.decision).toBe("NEGOTIATING");
  });
  it("rejects a negative salary and a bad decision", () => {
    expect(validateOfferInput({ baseSalary: -5 }).ok).toBe(false);
    expect(validateOfferInput({ decision: "MAYBE" }).ok).toBe(false);
  });
});

describe("note + transition + application-update validation", () => {
  it("rejects an empty note body", () => {
    expect(validateNoteInput({ body: "  " }).ok).toBe(false);
  });
  it("rejects an invalid note category", () => {
    expect(validateNoteInput({ body: "hi", category: "RANDOM" }).ok).toBe(false);
  });
  it("validates a transition body (status + reopen)", () => {
    const r = validateTransition({ status: "APPLIED", reopen: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.to).toBe("APPLIED");
      expect(r.value.reopen).toBe(true);
    }
  });
  it("rejects an unknown transition target", () => {
    expect(validateTransition({ status: "NOPE" }).ok).toBe(false);
  });
  it("rejects an invalid email on application update", () => {
    expect(validateApplicationUpdate({ recruiterEmail: "not-an-email" }).ok).toBe(false);
  });
  it("accepts a follow-up update", () => {
    const r = validateApplicationUpdate({
      followUpDate: "2026-07-20T00:00:00Z",
      followUpReason: "Ping recruiter",
    });
    expect(r.ok).toBe(true);
  });
});

describe("list query parsing (pagination + filters)", () => {
  it("applies safe defaults", () => {
    const q = parseApplicationListQuery(params({}));
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(25);
    expect(q.lifecycle).toBe("active");
    expect(q.sort).toBe("updated");
  });
  it("clamps page size and rejects invalid status/sort", () => {
    const q = parseApplicationListQuery(
      params({ pageSize: "9999", status: "BOGUS", sort: "bogus", page: "-3" })
    );
    expect(q.pageSize).toBe(100);
    expect(q.status).toBeNull();
    expect(q.sort).toBe("updated");
    expect(q.page).toBe(1);
  });
  it("parses valid filters", () => {
    const q = parseApplicationListQuery(
      params({ status: "APPLIED", lifecycle: "closed", workplace: "REMOTE", hasCoverLetter: "true", followUp: "overdue" })
    );
    expect(q.status).toBe("APPLIED");
    expect(q.lifecycle).toBe("closed");
    expect(q.workplaceType).toBe("REMOTE");
    expect(q.hasCoverLetter).toBe(true);
    expect(q.followUp).toBe("overdue");
  });
});
