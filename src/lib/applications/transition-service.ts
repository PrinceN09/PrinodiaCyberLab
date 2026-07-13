/**
 * ApplicationTransitionService — the ONLY place status changes are
 * applied. Loads the application user-scoped, validates the change
 * against the central transition graph, applies status + derived
 * side-effects (appliedDate, reopen bookkeeping, lastActivityAt), and
 * writes a timeline event — all in one transaction.
 */
import type { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, transitionError } from "./errors";
import { assertReopen, assertTransition } from "./transitions";
import { isTerminal } from "./status";
import { closeEventKind, recordEvent } from "./timeline";

export type TransitionInput = {
  to: string;
  reopen?: boolean;
  note?: string | null;
};

export async function transitionApplication(
  userId: string,
  applicationId: string,
  { to, reopen = false, note = null }: TransitionInput
) {
  const current = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, status: true, appliedDate: true },
  });
  if (!current) throw notFound();
  if (current.userId !== userId) throw forbidden();

  const verdict = reopen
    ? assertReopen(current.status, to)
    : assertTransition(current.status, to);
  if (!verdict.ok) throw transitionError(verdict.error);

  const now = new Date();
  const from = current.status;

  const data: Record<string, unknown> = {
    status: verdict.to as JobStatus,
    lastActivityAt: now,
  };
  // First time reaching APPLIED stamps the applied date.
  if (verdict.to === "APPLIED" && !current.appliedDate) {
    data.appliedDate = now;
  }
  if (reopen) data.reopenedAt = now;

  await prisma.$transaction(async (tx) => {
    await tx.jobApplication.update({ where: { id: applicationId }, data });

    if (reopen) {
      await recordEvent(tx, applicationId, {
        kind: "application_reopened",
        userId,
        summary: `Reopened into ${verdict.to}`,
        note,
        metadata: { from, to: verdict.to },
      });
      return;
    }

    // Terminal transitions get their dedicated close event; everything
    // else is a generic status_changed. Reaching APPLIED also logs a
    // submission event for a clear audit trail.
    const closeKind = closeEventKind(verdict.to);
    if (closeKind) {
      await recordEvent(tx, applicationId, {
        kind: closeKind,
        userId,
        summary: `Moved to ${verdict.to}`,
        note,
        metadata: { from, to: verdict.to },
      });
    } else {
      await recordEvent(tx, applicationId, {
        kind: "status_changed",
        userId,
        summary: `${from} → ${verdict.to}`,
        note,
        metadata: { from, to: verdict.to },
      });
      if (verdict.to === "APPLIED" && from !== "APPLIED") {
        await recordEvent(tx, applicationId, {
          kind: "application_submitted",
          userId,
          metadata: { from },
        });
      }
    }
  });

  return { from, to: verdict.to, reopened: reopen };
}

/** True when the application is currently in a closed/terminal state. */
export function applicationIsClosed(status: string): boolean {
  return isTerminal(status);
}
