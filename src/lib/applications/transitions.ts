/**
 * Central application status-transition graph. Every allowed status
 * change is defined HERE — never scattered across UI or routes. Pure
 * and unit-testable.
 *
 * Rules:
 * - The happy path advances Saved → … → Offer.
 * - Realistic skips are allowed (e.g. Applied → Interview).
 * - Any active state may go to REJECTED, WITHDRAWN, or ARCHIVED.
 * - Terminal (closed) states cannot return to an active stage without
 *   an explicit reopen() — direct closed→active transitions are denied.
 */
import {
  ACTIVE_STATUSES,
  isApplicationStatus,
  isTerminal,
  type ApplicationStatus,
} from "./status";

/**
 * Explicit forward/skip/sideways edges between active states. Backward
 * moves are deliberately NOT auto-allowed: once an application reaches
 * OFFER it cannot slide back to PREPARING via a normal change (per the
 * transition rules). A short list of pragmatic corrections is added
 * where recruitment genuinely needs it (e.g. an early-stage typo fix),
 * but never out of OFFER.
 */
const FORWARD_EDGES: Record<ApplicationStatus, ApplicationStatus[]> = {
  DISCOVERED: ["SAVED", "PREPARING"],
  SAVED: ["PREPARING", "READY_TO_APPLY", "APPLIED"],
  PREPARING: ["SAVED", "READY_TO_APPLY", "APPLIED"],
  READY_TO_APPLY: ["PREPARING", "APPLIED"],
  APPLIED: [
    "RECRUITER_CONTACT",
    "ASSESSMENT",
    "INTERVIEW",
    "FINAL_INTERVIEW",
    "OFFER",
  ],
  RECRUITER_CONTACT: ["ASSESSMENT", "INTERVIEW", "FINAL_INTERVIEW", "OFFER"],
  ASSESSMENT: ["INTERVIEW", "FINAL_INTERVIEW", "OFFER"],
  INTERVIEW: ["ASSESSMENT", "FINAL_INTERVIEW", "OFFER"],
  FINAL_INTERVIEW: ["INTERVIEW", "OFFER"],
  // OFFER only closes or gets reopened elsewhere — no slide back to prep.
  OFFER: [],
  // Terminal states have no forward edges; use reopen().
  REJECTED: [],
  WITHDRAWN: [],
  ARCHIVED: [],
};

/** Terminal targets available from every active state. */
const CLOSE_TARGETS: ApplicationStatus[] = ["REJECTED", "WITHDRAWN", "ARCHIVED"];

/** All statuses reachable from `from` via a normal (non-reopen) change. */
export function allowedTransitions(from: string): ApplicationStatus[] {
  if (!isApplicationStatus(from)) return [];
  if (isTerminal(from)) return []; // closed → nothing without reopen
  const set = new Set<ApplicationStatus>([
    ...FORWARD_EDGES[from],
    ...CLOSE_TARGETS,
  ]);
  set.delete(from);
  return [...set];
}

export function canTransition(from: string, to: string): boolean {
  return (
    isApplicationStatus(to) && allowedTransitions(from).includes(to)
  );
}

export type TransitionResult =
  | { ok: true; from: ApplicationStatus; to: ApplicationStatus }
  | { ok: false; error: string };

/**
 * Validates a normal status change. Reopening a closed application is
 * a separate, explicit operation (see reopenTarget / assertReopen).
 */
export function assertTransition(from: string, to: string): TransitionResult {
  if (!isApplicationStatus(from)) {
    return { ok: false, error: `Unknown current status "${from}"` };
  }
  if (!isApplicationStatus(to)) {
    return { ok: false, error: `Unknown target status "${to}"` };
  }
  if (from === to) {
    return { ok: false, error: "Application is already in that status" };
  }
  if (isTerminal(from)) {
    return {
      ok: false,
      error:
        "This application is closed. Reopen it before moving it back into the pipeline.",
    };
  }
  if (!canTransition(from, to)) {
    return {
      ok: false,
      error: `Cannot move from ${from} to ${to}`,
    };
  }
  return { ok: true, from, to };
}

/** Default stage a reopened (closed) application returns to. */
export const DEFAULT_REOPEN_TARGET: ApplicationStatus = "SAVED";

/** Active stages an application may be reopened into. */
export function reopenTargets(): ApplicationStatus[] {
  return [...ACTIVE_STATUSES];
}

export function assertReopen(
  from: string,
  to: string = DEFAULT_REOPEN_TARGET
): TransitionResult {
  if (!isApplicationStatus(from)) {
    return { ok: false, error: `Unknown current status "${from}"` };
  }
  if (!isTerminal(from)) {
    return { ok: false, error: "Only closed applications can be reopened" };
  }
  if (!isApplicationStatus(to) || isTerminal(to)) {
    return { ok: false, error: `Cannot reopen into "${to}"` };
  }
  return { ok: true, from, to };
}
