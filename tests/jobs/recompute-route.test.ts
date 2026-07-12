import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route-level security for POST /api/matching/recompute:
 * authentication mandatory, per-user cooldown, and recomputation
 * scoped to the authenticated user. Session, current-user, and the
 * matching service are mocked; the real cooldown guard is exercised.
 */

const getSessionUser = vi.fn();
const getCurrentUser = vi.fn();
const recomputeMatches = vi.fn();

vi.mock("@/lib/session", () => ({
  getSessionUser: () => getSessionUser(),
}));
vi.mock("@/lib/current-user", () => ({
  getCurrentUser: () => getCurrentUser(),
}));
vi.mock("@/lib/jobs/matching-service", () => ({
  recomputeMatches: (...args: unknown[]) => recomputeMatches(...args),
}));

import { POST } from "@/app/api/matching/recompute/route";
import { resetRecomputeCooldowns } from "@/lib/jobs/recompute-guard";

function post(body: unknown = {}) {
  return POST(
    new Request("http://localhost/api/matching/recompute", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    })
  );
}

beforeEach(() => {
  resetRecomputeCooldowns();
  getSessionUser.mockReset();
  getCurrentUser.mockReset();
  recomputeMatches.mockReset();
  recomputeMatches.mockResolvedValue({
    postings: 3,
    scored: 3,
    ineligible: 0,
    durationMs: 5,
  });
});

describe("POST /api/matching/recompute", () => {
  it("rejects unauthenticated requests with 401 and never recomputes", async () => {
    getSessionUser.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(401);
    expect(recomputeMatches).not.toHaveBeenCalled();
  });

  it("scopes recomputation to the authenticated user", async () => {
    getSessionUser.mockResolvedValue({ id: "user-a" });
    getCurrentUser.mockResolvedValue({ id: "user-a" });
    const res = await post();
    expect(res.status).toBe(200);
    expect(recomputeMatches).toHaveBeenCalledWith("user-a", undefined);
  });

  it("enforces the per-user cooldown with a 429 on immediate repeat", async () => {
    getSessionUser.mockResolvedValue({ id: "user-a" });
    getCurrentUser.mockResolvedValue({ id: "user-a" });

    const first = await post();
    expect(first.status).toBe(200);

    const second = await post();
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBeTruthy();
    // Only the first request reached the service.
    expect(recomputeMatches).toHaveBeenCalledTimes(1);
  });

  it("cooldown is per-user — a second user is not blocked by the first", async () => {
    getSessionUser.mockResolvedValue({ id: "user-a" });
    getCurrentUser.mockResolvedValue({ id: "user-a" });
    await post();

    getSessionUser.mockResolvedValue({ id: "user-b" });
    getCurrentUser.mockResolvedValue({ id: "user-b" });
    const res = await post();
    expect(res.status).toBe(200);
    expect(recomputeMatches).toHaveBeenLastCalledWith("user-b", undefined);
  });

  it("validates postingIds and rejects a malformed array with 400", async () => {
    getSessionUser.mockResolvedValue({ id: "user-a" });
    getCurrentUser.mockResolvedValue({ id: "user-a" });
    const res = await post({ postingIds: [123, {}] });
    expect(res.status).toBe(400);
    expect(recomputeMatches).not.toHaveBeenCalled();
  });

  it("passes a valid postingIds scope through to the service", async () => {
    getSessionUser.mockResolvedValue({ id: "user-a" });
    getCurrentUser.mockResolvedValue({ id: "user-a" });
    const res = await post({ postingIds: ["p1", "p2"] });
    expect(res.status).toBe(200);
    expect(recomputeMatches).toHaveBeenCalledWith("user-a", ["p1", "p2"]);
  });
});
