/**
 * InterviewService — multiple interview records per application, all
 * user-scoped. Writes timeline events for schedule/reschedule/complete/
 * cancel. Enforces end-not-before-start using merged (DB + patch) values.
 */
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, validation } from "./errors";
import { requireOwnedApplication } from "./application-service";
import { recordEvent, type ApplicationEventKind } from "./timeline";

function assertTimeOrder(start: Date | null, end: Date | null) {
  if (start && end && end.getTime() < start.getTime()) {
    throw validation("Interview end time cannot be before the start time");
  }
}

export async function createInterview(
  userId: string,
  applicationId: string,
  data: Record<string, unknown>
) {
  await requireOwnedApplication(userId, applicationId);
  assertTimeOrder(
    (data.startTime as Date) ?? null,
    (data.endTime as Date) ?? null
  );

  return prisma.$transaction(async (tx) => {
    const interview = await tx.applicationInterview.create({
      data: { ...data, applicationId, userId },
    });
    await recordEvent(tx, applicationId, {
      kind: "interview_scheduled",
      userId,
      summary: interviewSummary(data),
      metadata: { interviewId: interview.id, type: data.type ?? null },
    });
    return interview;
  });
}

export async function updateInterview(
  userId: string,
  interviewId: string,
  patch: Record<string, unknown>
) {
  const existing = await prisma.applicationInterview.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      userId: true,
      applicationId: true,
      status: true,
      startTime: true,
      endTime: true,
    },
  });
  if (!existing) throw notFound("Interview not found");
  if (existing.userId !== userId) throw forbidden();

  const nextStart =
    "startTime" in patch ? (patch.startTime as Date | null) : existing.startTime;
  const nextEnd =
    "endTime" in patch ? (patch.endTime as Date | null) : existing.endTime;
  assertTimeOrder(nextStart, nextEnd);

  return prisma.$transaction(async (tx) => {
    const interview = await tx.applicationInterview.update({
      where: { id: interviewId },
      data: patch,
    });

    const nextStatus = patch.status as string | undefined;
    let kind: ApplicationEventKind | null = null;
    if (nextStatus && nextStatus !== existing.status) {
      if (nextStatus === "RESCHEDULED") kind = "interview_rescheduled";
      else if (nextStatus === "COMPLETED") kind = "interview_completed";
      else if (nextStatus === "CANCELLED") kind = "interview_cancelled";
    }
    if (kind) {
      await recordEvent(tx, existing.applicationId, {
        kind,
        userId,
        summary: interviewSummary({ ...existing, ...patch }),
        metadata: { interviewId },
      });
    }
    return interview;
  });
}

export async function deleteInterview(userId: string, interviewId: string) {
  const existing = await prisma.applicationInterview.findUnique({
    where: { id: interviewId },
    select: { id: true, userId: true },
  });
  if (!existing) throw notFound("Interview not found");
  if (existing.userId !== userId) throw forbidden();
  await prisma.applicationInterview.delete({ where: { id: interviewId } });
  return { ok: true };
}

function interviewSummary(data: Record<string, unknown>): string {
  const type = (data.type as string) ?? "Interview";
  const label = String(type).replace(/_/g, " ").toLowerCase();
  const when = (data.scheduledAt ?? data.startTime) as Date | undefined;
  return when
    ? `${label} on ${new Date(when).toISOString().slice(0, 10)}`
    : label;
}
