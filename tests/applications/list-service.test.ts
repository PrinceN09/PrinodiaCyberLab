import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    db: {
      jobApplication: { findMany: fn(), count: fn() },
    },
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { listApplications } from "@/lib/applications/application-service";
import { parseApplicationListQuery } from "@/lib/applications/validation";

function q(obj: Record<string, string> = {}) {
  return parseApplicationListQuery(new URLSearchParams(obj));
}

/** Flatten a Prisma AND[] into one object for easy assertions. */
function flatten(where: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const and = (where.AND as Record<string, unknown>[]) ?? [];
  for (const clause of and) Object.assign(out, clause);
  return out;
}

beforeEach(() => {
  db.jobApplication.findMany.mockReset().mockResolvedValue([]);
  db.jobApplication.count.mockReset().mockResolvedValue(0);
});

describe("listApplications — user scoping + filters", () => {
  it("always scopes to the user and defaults to active lifecycle", async () => {
    await listApplications("me", q());
    const where = db.jobApplication.findMany.mock.calls[0][0].where;
    const flat = flatten(where);
    expect(flat.userId).toBe("me");
    expect(flat.status).toMatchObject({ in: expect.arrayContaining(["SAVED", "APPLIED"]) });
  });

  it("closed lifecycle filters to terminal statuses", async () => {
    await listApplications("me", q({ lifecycle: "closed" }));
    const flat = flatten(db.jobApplication.findMany.mock.calls[0][0].where);
    expect(flat.status).toMatchObject({
      in: expect.arrayContaining(["REJECTED", "WITHDRAWN", "ARCHIVED"]),
    });
  });

  it("an explicit status filter overrides lifecycle", async () => {
    await listApplications("me", q({ status: "INTERVIEW" }));
    const flat = flatten(db.jobApplication.findMany.mock.calls[0][0].where);
    expect(flat.status).toBe("INTERVIEW");
  });

  it("hasCoverLetter=false filters to null coverLetterId", async () => {
    await listApplications("me", q({ hasCoverLetter: "false" }));
    const flat = flatten(db.jobApplication.findMany.mock.calls[0][0].where);
    expect(flat.coverLetterId).toBeNull();
  });

  it("paginates with skip/take and returns pageCount", async () => {
    db.jobApplication.count.mockResolvedValue(60);
    const res = await listApplications("me", q({ page: "2", pageSize: "25" }));
    const call = db.jobApplication.findMany.mock.calls[0][0];
    expect(call.skip).toBe(25);
    expect(call.take).toBe(25);
    expect(res.pageCount).toBe(3);
    expect(res.page).toBe(2);
  });
});
