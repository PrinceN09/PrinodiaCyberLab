import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const getCurrentUser = vi.fn();
const listApplications = vi.fn();
const createManualApplication = vi.fn();
const assertNoDuplicateManual = vi.fn();
const transitionApplication = vi.fn();

vi.mock("@/lib/session", () => ({ getSessionUser: () => getSessionUser() }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/applications/application-service", () => ({
  listApplications: (...a: unknown[]) => listApplications(...a),
  createManualApplication: (...a: unknown[]) => createManualApplication(...a),
  assertNoDuplicateManual: (...a: unknown[]) => assertNoDuplicateManual(...a),
}));
vi.mock("@/lib/applications/transition-service", () => ({
  transitionApplication: (...a: unknown[]) => transitionApplication(...a),
}));

import { GET, POST } from "@/app/api/applications/route";
import { POST as TRANSITION } from "@/app/api/applications/[id]/transition/route";
import { ApplicationError } from "@/lib/applications/errors";

function req(body?: unknown) {
  return new Request("http://localhost/api/applications", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  for (const f of [
    getSessionUser,
    getCurrentUser,
    listApplications,
    createManualApplication,
    assertNoDuplicateManual,
    transitionApplication,
  ]) {
    f.mockReset();
  }
  getCurrentUser.mockResolvedValue({ id: "me" });
});

describe("GET /api/applications", () => {
  it("401s when unauthenticated", async () => {
    getSessionUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/applications"));
    expect(res.status).toBe(401);
    expect(listApplications).not.toHaveBeenCalled();
  });

  it("lists for the authenticated user", async () => {
    getSessionUser.mockResolvedValue({ id: "me" });
    listApplications.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, pageCount: 1 });
    const res = await GET(new Request("http://localhost/api/applications?status=APPLIED"));
    expect(res.status).toBe(200);
    expect(listApplications.mock.calls[0][0]).toBe("me");
  });
});

describe("POST /api/applications", () => {
  it("401s when unauthenticated", async () => {
    getSessionUser.mockResolvedValue(null);
    const res = await POST(req({ company: "A", jobTitle: "B" }));
    expect(res.status).toBe(401);
  });

  it("400s on invalid body", async () => {
    getSessionUser.mockResolvedValue({ id: "me" });
    const res = await POST(req({ company: "" }));
    expect(res.status).toBe(400);
    expect(createManualApplication).not.toHaveBeenCalled();
  });

  it("creates and returns 201", async () => {
    getSessionUser.mockResolvedValue({ id: "me" });
    assertNoDuplicateManual.mockResolvedValue(undefined);
    createManualApplication.mockResolvedValue({ id: "a1", company: "Acme" });
    const res = await POST(req({ company: "Acme", jobTitle: "SOC Analyst" }));
    expect(res.status).toBe(201);
  });

  it("maps a service conflict to its HTTP status without leaking details", async () => {
    getSessionUser.mockResolvedValue({ id: "me" });
    assertNoDuplicateManual.mockRejectedValue(
      new ApplicationError("CONFLICT", "You already have an application for this role")
    );
    const res = await POST(req({ company: "Acme", jobTitle: "SOC Analyst" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("already have an application");
  });
});

describe("POST /api/applications/:id/transition", () => {
  const ctx = { params: Promise.resolve({ id: "a1" }) };

  it("401s when unauthenticated", async () => {
    getSessionUser.mockResolvedValue(null);
    const res = await TRANSITION(req({ status: "APPLIED" }), ctx);
    expect(res.status).toBe(401);
  });

  it("400s on an invalid target status", async () => {
    getSessionUser.mockResolvedValue({ id: "me" });
    const res = await TRANSITION(req({ status: "NONSENSE" }), ctx);
    expect(res.status).toBe(400);
  });

  it("maps an invalid transition to 422", async () => {
    getSessionUser.mockResolvedValue({ id: "me" });
    transitionApplication.mockRejectedValue(
      new ApplicationError("TRANSITION", "Cannot move from SAVED to OFFER")
    );
    const res = await TRANSITION(req({ status: "OFFER" }), ctx);
    expect(res.status).toBe(422);
  });

  it("calls the service scoped to the user on a valid transition", async () => {
    getSessionUser.mockResolvedValue({ id: "me" });
    transitionApplication.mockResolvedValue({ from: "SAVED", to: "PREPARING" });
    const res = await TRANSITION(req({ status: "PREPARING" }), ctx);
    expect(res.status).toBe(200);
    expect(transitionApplication.mock.calls[0][0]).toBe("me");
  });
});
