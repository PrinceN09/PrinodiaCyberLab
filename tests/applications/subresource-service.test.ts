import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => {
  const fn = () => vi.fn();
  const model = () => ({
    findUnique: fn(),
    findFirst: fn(),
    findMany: fn(),
    create: fn(),
    update: fn(),
    upsert: fn(),
    delete: fn(),
  });
  const database = {
    jobApplication: model(),
    jobApplicationEvent: model(),
    applicationInterview: model(),
    applicationAssessment: model(),
    applicationOffer: model(),
    applicationNote: model(),
    $transaction: fn(),
  };
  return { db: database };
});

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  createInterview,
  deleteInterview,
  updateInterview,
} from "@/lib/applications/interview-service";
import {
  createAssessment,
  updateAssessment,
} from "@/lib/applications/assessment-service";
import { upsertOffer } from "@/lib/applications/offer-service";
import { createNote, updateNote } from "@/lib/applications/note-service";
import { isApplicationError } from "@/lib/applications/errors";

function resetDb() {
  for (const key of Object.keys(db)) {
    const model = (db as Record<string, unknown>)[key];
    if (typeof model === "function") {
      (model as ReturnType<typeof vi.fn>).mockReset();
      continue;
    }
    for (const m of Object.values(model as Record<string, ReturnType<typeof vi.fn>>)) {
      m.mockReset();
    }
  }
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? (arg as (t: unknown) => unknown)(db) : Promise.all(arg as unknown[])
  );
  // Default: the application belongs to "me".
  db.jobApplication.findUnique.mockResolvedValue({ id: "a1", userId: "me", status: "APPLIED" });
  db.jobApplication.update.mockResolvedValue({});
}

beforeEach(resetDb);

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "NO_ERROR";
  } catch (e) {
    return isApplicationError(e) ? e.code : "OTHER";
  }
}

const eventKinds = () =>
  db.jobApplicationEvent.create.mock.calls.map((c) => c[0].data.kind);

describe("interviews", () => {
  it("creates an interview and logs interview_scheduled", async () => {
    db.applicationInterview.create.mockResolvedValue({ id: "i1" });
    await createInterview("me", "a1", { type: "TECHNICAL_INTERVIEW" });
    expect(db.applicationInterview.create).toHaveBeenCalled();
    expect(eventKinds()).toContain("interview_scheduled");
  });

  it("supports multiple interviews per application", async () => {
    db.applicationInterview.create.mockResolvedValueOnce({ id: "i1" });
    db.applicationInterview.create.mockResolvedValueOnce({ id: "i2" });
    await createInterview("me", "a1", { type: "RECRUITER_SCREEN" });
    await createInterview("me", "a1", { type: "HIRING_MANAGER" });
    expect(db.applicationInterview.create).toHaveBeenCalledTimes(2);
  });

  it("rejects end before start at the service layer", async () => {
    const c = await code(
      createInterview("me", "a1", {
        startTime: new Date("2026-07-20T15:00:00Z"),
        endTime: new Date("2026-07-20T14:00:00Z"),
      })
    );
    expect(c).toBe("VALIDATION");
  });

  it("reschedule logs interview_rescheduled", async () => {
    db.applicationInterview.findUnique.mockResolvedValue({
      id: "i1", userId: "me", applicationId: "a1", status: "SCHEDULED", startTime: null, endTime: null,
    });
    db.applicationInterview.update.mockResolvedValue({ id: "i1" });
    await updateInterview("me", "i1", { status: "RESCHEDULED" });
    expect(eventKinds()).toContain("interview_rescheduled");
  });

  it("complete logs interview_completed", async () => {
    db.applicationInterview.findUnique.mockResolvedValue({
      id: "i1", userId: "me", applicationId: "a1", status: "SCHEDULED", startTime: null, endTime: null,
    });
    db.applicationInterview.update.mockResolvedValue({ id: "i1" });
    await updateInterview("me", "i1", { status: "COMPLETED" });
    expect(eventKinds()).toContain("interview_completed");
  });

  it("cannot edit another user's interview", async () => {
    db.applicationInterview.findUnique.mockResolvedValue({
      id: "i1", userId: "other", applicationId: "a1", status: "SCHEDULED", startTime: null, endTime: null,
    });
    expect(await code(updateInterview("me", "i1", { status: "COMPLETED" }))).toBe("FORBIDDEN");
  });

  it("cannot delete another user's interview", async () => {
    db.applicationInterview.findUnique.mockResolvedValue({ id: "i1", userId: "other" });
    expect(await code(deleteInterview("me", "i1"))).toBe("FORBIDDEN");
  });
});

describe("assessments", () => {
  it("creates an assessment and logs assessment_received", async () => {
    db.applicationAssessment.create.mockResolvedValue({ id: "as1" });
    await createAssessment("me", "a1", { name: "SOC Lab", type: "CYBERSECURITY_LAB" });
    expect(eventKinds()).toContain("assessment_received");
  });

  it("moving to SUBMITTED logs assessment_submitted", async () => {
    db.applicationAssessment.findUnique.mockResolvedValue({
      id: "as1", userId: "me", applicationId: "a1", status: "IN_PROGRESS", name: "SOC Lab",
    });
    db.applicationAssessment.update.mockResolvedValue({ id: "as1" });
    await updateAssessment("me", "as1", { status: "SUBMITTED" });
    expect(eventKinds()).toContain("assessment_submitted");
  });

  it("cannot edit another user's assessment", async () => {
    db.applicationAssessment.findUnique.mockResolvedValue({
      id: "as1", userId: "other", applicationId: "a1", status: "IN_PROGRESS", name: "X",
    });
    expect(await code(updateAssessment("me", "as1", { status: "SUBMITTED" }))).toBe("FORBIDDEN");
  });
});

describe("offers", () => {
  it("first save logs offer_received", async () => {
    db.applicationOffer.findUnique.mockResolvedValue(null);
    db.applicationOffer.upsert.mockResolvedValue({ id: "of1" });
    await upsertOffer("me", "a1", { positionTitle: "SOC Analyst", decision: "PENDING" });
    expect(eventKinds()).toContain("offer_received");
  });

  it("subsequent save logs offer_updated", async () => {
    db.applicationOffer.findUnique.mockResolvedValue({ id: "of1", userId: "me", receivedDate: null, expiryDate: null });
    db.applicationOffer.upsert.mockResolvedValue({ id: "of1" });
    await upsertOffer("me", "a1", { decision: "NEGOTIATING" });
    expect(eventKinds()).toContain("offer_updated");
  });

  it("rejects expiry before received at the service layer", async () => {
    db.applicationOffer.findUnique.mockResolvedValue(null);
    const c = await code(
      upsertOffer("me", "a1", {
        receivedDate: new Date("2026-07-20T00:00:00Z"),
        expiryDate: new Date("2026-07-18T00:00:00Z"),
      })
    );
    expect(c).toBe("VALIDATION");
  });

  it("cannot modify another user's offer", async () => {
    db.applicationOffer.findUnique.mockResolvedValue({ id: "of1", userId: "other", receivedDate: null, expiryDate: null });
    expect(await code(upsertOffer("me", "a1", { decision: "ACCEPTED" }))).toBe("FORBIDDEN");
  });
});

describe("notes", () => {
  it("creates a note and logs note_added", async () => {
    db.applicationNote.create.mockResolvedValue({ id: "n1" });
    await createNote("me", "a1", { body: "Great call", category: "RECRUITER" });
    expect(eventKinds()).toContain("note_added");
  });

  it("cannot edit another user's note", async () => {
    db.applicationNote.findUnique.mockResolvedValue({ id: "n1", userId: "other" });
    expect(await code(updateNote("me", "n1", { body: "hax" }))).toBe("FORBIDDEN");
  });
});
