import { NextResponse } from "next/server";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  deleteAttachmentFile,
  openAttachment,
} from "@/lib/notes/attachment-storage";

/** Streams an attachment (inline for images/PDF, download otherwise). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;
  const user = await getCurrentUser();

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, note: { userId: user.id } },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const stream = openAttachment(attachment.storagePath);
  if (!stream) {
    return NextResponse.json(
      { error: "File is missing from storage" },
      { status: 410 }
    );
  }

  const inline =
    attachment.mimeType.startsWith("image/") ||
    attachment.mimeType === "application/pdf";
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(
        attachment.fileName
      )}"`,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;
  const user = await getCurrentUser();

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, note: { userId: user.id } },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteAttachmentFile(attachment.storagePath); // best effort
  return NextResponse.json({ ok: true });
}
