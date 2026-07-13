/**
 * AssessmentService — recruitment assessments per application, all
 * user-scoped. Writes received/submitted/updated timeline events.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound } from "./errors";
import { requireOwnedApplication } from "./application-service";
import { recordEvent, type ApplicationEventKind } from "./timeline";

export async function createAssessment(
  userId: string,
  applicationId: string,
  data: Record<string, unknown>
) {
  await requireOwnedApplication(userId, applicationId);
  return prisma.$transaction(async (tx) => {
    // `name` is required (validated at the route boundary); the explicit
    // fallback + Unchecked cast satisfy Prisma's create input type.
    const assessment = await tx.applicationAssessment.create({
      data: {
        ...data,
        name: String(data.name ?? "Assessment"),
        applicationId,
        userId,
      } as Prisma.ApplicationAssessmentUncheckedCreateInput,
    });
    await recordEvent(tx, applicationId, {
      kind: "assessment_received",
      userId,
      summary: String(data.name ?? "Assessment"),
      metadata: { assessmentId: assessment.id, type: data.type ?? null },
    });
    return assessment;
  });
}

export async function updateAssessment(
  userId: string,
  assessmentId: string,
  patch: Record<string, unknown>
) {
  const existing = await prisma.applicationAssessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, userId: true, applicationId: true, status: true, name: true },
  });
  if (!existing) throw notFound("Assessment not found");
  if (existing.userId !== userId) throw forbidden();

  return prisma.$transaction(async (tx) => {
    const assessment = await tx.applicationAssessment.update({
      where: { id: assessmentId },
      data: patch,
    });
    const nextStatus = patch.status as string | undefined;
    let kind: ApplicationEventKind = "assessment_updated";
    if (nextStatus && nextStatus !== existing.status && nextStatus === "SUBMITTED") {
      kind = "assessment_submitted";
    }
    await recordEvent(tx, existing.applicationId, {
      kind,
      userId,
      summary: existing.name,
      metadata: { assessmentId, status: nextStatus ?? existing.status },
    });
    return assessment;
  });
}

export async function deleteAssessment(userId: string, assessmentId: string) {
  const existing = await prisma.applicationAssessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, userId: true },
  });
  if (!existing) throw notFound("Assessment not found");
  if (existing.userId !== userId) throw forbidden();
  await prisma.applicationAssessment.delete({ where: { id: assessmentId } });
  return { ok: true };
}
