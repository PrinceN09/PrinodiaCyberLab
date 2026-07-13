/**
 * OfferService — one offer record per application (upsert), user-scoped.
 * Writes offer_received on first creation and offer_updated thereafter.
 * Cross-field validation (expiry ≥ received) is enforced in the
 * validator and re-checked here against merged values.
 */
import { prisma } from "@/lib/prisma";
import { forbidden, validation } from "./errors";
import { requireOwnedApplication } from "./application-service";
import { recordEvent } from "./timeline";

function assertExpiryOrder(received: Date | null, expiry: Date | null) {
  if (received && expiry && expiry.getTime() < received.getTime()) {
    throw validation("Offer expiry date cannot be before the date received");
  }
}

export async function upsertOffer(
  userId: string,
  applicationId: string,
  patch: Record<string, unknown>
) {
  await requireOwnedApplication(userId, applicationId);

  const existing = await prisma.applicationOffer.findUnique({
    where: { applicationId },
    select: { id: true, userId: true, receivedDate: true, expiryDate: true },
  });
  if (existing && existing.userId !== userId) throw forbidden();

  const received =
    "receivedDate" in patch
      ? (patch.receivedDate as Date | null)
      : (existing?.receivedDate ?? null);
  const expiry =
    "expiryDate" in patch
      ? (patch.expiryDate as Date | null)
      : (existing?.expiryDate ?? null);
  assertExpiryOrder(received, expiry);

  return prisma.$transaction(async (tx) => {
    const offer = await tx.applicationOffer.upsert({
      where: { applicationId },
      update: patch,
      create: {
        ...patch,
        applicationId,
        userId,
        receivedDate: (patch.receivedDate as Date) ?? new Date(),
      },
    });
    await tx.jobApplication.update({
      where: { id: applicationId },
      data: { lastActivityAt: new Date() },
    });
    await recordEvent(tx, applicationId, {
      kind: existing ? "offer_updated" : "offer_received",
      userId,
      summary: existing
        ? "Offer updated"
        : `Offer received${patch.positionTitle ? ` — ${patch.positionTitle}` : ""}`,
      metadata: { decision: patch.decision ?? null },
    });
    return offer;
  });
}

export async function getOffer(userId: string, applicationId: string) {
  await requireOwnedApplication(userId, applicationId);
  return prisma.applicationOffer.findUnique({ where: { applicationId } });
}
