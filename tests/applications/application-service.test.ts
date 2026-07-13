import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Service tests with a mocked Prisma client. `$transaction(cb)` runs
 * the callback with the same mock, so timeline writes are observable.
 */
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
    deleteMany: fn(),
    count: fn(),
    aggregate: fn(),
    groupBy: fn(),
  });
  const database = {
    jobApplication: model(),
    jobApplicationEvent: model(),
    jobPosting: model(),
    resume: model(),
    coverLetter: model(),
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
  assertNoDuplicateManual,
  createManualApplication,
  getApplication,
  saveFromPosting,
  selectResume,
  updateApplication,
} from "@/lib/applications/application-service";
import { transitionApplication } from "@/lib/applications/transition-service";
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
  // Default: run transaction callback against the same mock.
  db.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") return (arg as (t: unknown) => unknown)(db);
    return Promise.all(arg as unknown[]);
  });
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

describe("authorization — no cross-user access", () => {
  it("getApplication rejects another user's application", async () => {
    db.jobApplication.findUnique.mockResolvedValue({ id: "a1", userId: "other" });
    expect(await code(getApplication("me", "a1"))).toBe("FORBIDDEN");
  });

  it("getApplication 404s a missing application", async () => {
    db.jobApplication.findUnique.mockResolvedValue(null);
    expect(await code(getApplication("me", "a1"))).toBe("NOT_FOUND");
  });

  it("updateApplication rejects another user's application", async () => {
    db.jobApplication.findUnique.mockResolvedValue({ userId: "other" });
    expect(await code(updateApplication("me", "a1", { notes: "x" }))).toBe("FORBIDDEN");
  });

  it("selectResume rejects attaching another user's resume", async () => {
    db.jobApplication.findUnique.mockResolvedValue({ id: "a1", userId: "me", status: "SAVED" });
    db.resume.findUnique.mockResolvedValue({ id: "r1", userId: "other", title: "Theirs" });
    expect(await code(selectResume("me", "a1", "r1"))).toBe("FORBIDDEN");
  });
});

describe("duplicate prevention", () => {
  it("blocks a duplicate manual application (same user + company + title)", async () => {
    db.jobApplication.findFirst.mockResolvedValue({ id: "dupe" });
    expect(await code(assertNoDuplicateManual("me", "Acme", "SOC Analyst"))).toBe("CONFLICT");
  });

  it("saveFromPosting is idempotent — returns the existing application", async () => {
    db.jobPosting.findUnique.mockResolvedValue({ id: "p1", title: "T", company: "C" });
    db.jobApplication.findFirst.mockResolvedValue({ id: "existing", status: "APPLIED" });
    const res = await saveFromPosting("me", "p1");
    expect(res).toEqual({ id: "existing", status: "APPLIED" });
    expect(db.jobApplication.create).not.toHaveBeenCalled();
  });
});

describe("creation writes the right shape + timeline", () => {
  it("createManualApplication marks source MANUAL and logs job_saved", async () => {
    db.jobApplication.create.mockResolvedValue({ id: "a1" });
    await createManualApplication("me", {
      company: "Acme",
      jobTitle: "SOC Analyst",
      location: null,
      url: null,
      applicationUrl: null,
      workplaceType: null,
      employmentType: null,
      salary: null,
      notes: null,
    });
    const arg = db.jobApplication.create.mock.calls[0][0];
    expect(arg.data.source).toBe("MANUAL");
    expect(arg.data.userId).toBe("me");
    expect(arg.data.events.create.kind).toBe("job_saved");
  });

  it("saveFromPosting creates a DISCOVERY application linked to the posting", async () => {
    db.jobPosting.findUnique.mockResolvedValue({
      id: "p1",
      title: "SOC Analyst",
      company: "Acme",
      location: "Remote",
      matchScore: 80,
    });
    db.jobApplication.findFirst.mockResolvedValue(null);
    db.jobApplication.create.mockResolvedValue({ id: "a1", status: "SAVED" });
    await saveFromPosting("me", "p1");
    const arg = db.jobApplication.create.mock.calls[0][0];
    expect(arg.data.source).toBe("DISCOVERY");
    expect(arg.data.jobPostingId).toBe("p1");
    expect(arg.data.matchScore).toBe(80);
  });

  it("updateApplication logs recruiter_added when a recruiter is first set", async () => {
    db.jobApplication.findUnique.mockResolvedValue({
      userId: "me",
      recruiterName: null,
      recruiterEmail: null,
      followUpDate: null,
      followUpCompleted: false,
    });
    db.jobApplication.update.mockResolvedValue({ id: "a1" });
    await updateApplication("me", "a1", { recruiterName: "Dana" });
    const kinds = db.jobApplicationEvent.create.mock.calls.map((c) => c[0].data.kind);
    expect(kinds).toContain("recruiter_added");
  });
});

describe("transition service", () => {
  it("applies a valid status change and logs status_changed", async () => {
    db.jobApplication.findUnique.mockResolvedValue({
      id: "a1",
      userId: "me",
      status: "SAVED",
      appliedDate: null,
    });
    db.jobApplication.update.mockResolvedValue({});
    const res = await transitionApplication("me", "a1", { to: "PREPARING" });
    expect(res).toMatchObject({ from: "SAVED", to: "PREPARING" });
    const kinds = db.jobApplicationEvent.create.mock.calls.map((c) => c[0].data.kind);
    expect(kinds).toContain("status_changed");
  });

  it("stamps appliedDate and logs submission when moving to APPLIED", async () => {
    db.jobApplication.findUnique.mockResolvedValue({
      id: "a1",
      userId: "me",
      status: "READY_TO_APPLY",
      appliedDate: null,
    });
    db.jobApplication.update.mockResolvedValue({});
    await transitionApplication("me", "a1", { to: "APPLIED" });
    const updateArg = db.jobApplication.update.mock.calls[0][0];
    expect(updateArg.data.status).toBe("APPLIED");
    expect(updateArg.data.appliedDate).toBeInstanceOf(Date);
    const kinds = db.jobApplicationEvent.create.mock.calls.map((c) => c[0].data.kind);
    expect(kinds).toContain("application_submitted");
  });

  it("rejects an invalid transition (SAVED → OFFER)", async () => {
    db.jobApplication.findUnique.mockResolvedValue({
      id: "a1",
      userId: "me",
      status: "SAVED",
      appliedDate: null,
    });
    expect(await code(transitionApplication("me", "a1", { to: "OFFER" }))).toBe("TRANSITION");
  });

  it("rejects a transition on another user's application", async () => {
    db.jobApplication.findUnique.mockResolvedValue({
      id: "a1",
      userId: "other",
      status: "SAVED",
      appliedDate: null,
    });
    expect(await code(transitionApplication("me", "a1", { to: "PREPARING" }))).toBe("FORBIDDEN");
  });

  it("reopen from a closed state logs application_reopened", async () => {
    db.jobApplication.findUnique.mockResolvedValue({
      id: "a1",
      userId: "me",
      status: "REJECTED",
      appliedDate: new Date(),
    });
    db.jobApplication.update.mockResolvedValue({});
    await transitionApplication("me", "a1", { to: "APPLIED", reopen: true });
    const kinds = db.jobApplicationEvent.create.mock.calls.map((c) => c[0].data.kind);
    expect(kinds).toContain("application_reopened");
  });
});
