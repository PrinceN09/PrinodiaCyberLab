import { describe, expect, it } from "vitest";
import {
  ACTIVE_STATUSES,
  APPLICATION_STATUSES,
  BOARD_COLUMNS,
  boardColumnFor,
  isActive,
  isTerminal,
  statusMeta,
  STATUS_META,
} from "@/lib/applications/status";

describe("status metadata", () => {
  it("covers all 13 statuses with label + description", () => {
    expect(APPLICATION_STATUSES).toHaveLength(13);
    for (const s of APPLICATION_STATUSES) {
      const m = STATUS_META[s];
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });
  it("classifies terminal vs active correctly", () => {
    for (const s of ["REJECTED", "WITHDRAWN", "ARCHIVED"]) {
      expect(isTerminal(s)).toBe(true);
      expect(isActive(s)).toBe(false);
    }
    for (const s of ["SAVED", "APPLIED", "OFFER"]) {
      expect(isActive(s)).toBe(true);
      expect(isTerminal(s)).toBe(false);
    }
  });
  it("active statuses are ordered by pipeline order", () => {
    const orders = ACTIVE_STATUSES.map((s) => STATUS_META[s].order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
  it("board columns exclude terminal states", () => {
    for (const c of BOARD_COLUMNS) expect(isTerminal(c)).toBe(false);
  });
  it("maps DISCOVERED into the SAVED column", () => {
    expect(boardColumnFor("DISCOVERED")).toBe("SAVED");
  });
  it("terminal states have no board column", () => {
    expect(boardColumnFor("REJECTED")).toBeNull();
  });
  it("statusMeta falls back gracefully", () => {
    expect(statusMeta("NONSENSE").value).toBe("SAVED");
  });
});
