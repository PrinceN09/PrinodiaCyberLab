import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  storeAttachment,
} from "@/lib/notes/attachment-storage";

/** Lists attachment metadata for a note. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const note = await prisma.note.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { noteId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  });
  return NextResponse.json(attachments);
}

/** Uploads a file (multipart/form-data, field "file"). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const note = await prisma.note.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    // fall through to the null check
  }
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Markdown files often arrive with an empty/octet-stream type.
  const mimeType =
    file.type ||
    (file.name.endsWith(".md") ? "text/markdown" : "application/octet-stream");
  if (!ALLOWED_ATTACHMENT_TYPES[mimeType]) {
    return NextResponse.json(
      { error: `File type not supported: ${mimeType}` },
      { status: 415 }
    );
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 25 MB limit" },
      { status: 413 }
    );
  }

  try {
    const attachmentId = randomUUID();
    const data = Buffer.from(await file.arrayBuffer());
    const storagePath = await storeAttachment(
      id,
      attachmentId,
      file.name,
      data
    );
    const attachment = await prisma.attachment.create({
      data: {
        id: attachmentId,
        noteId: id,
        fileName: file.name,
        mimeType,
        size: file.size,
        storagePath,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    console.error(`Failed to store attachment for note ${id}:`, err);
    return NextResponse.json(
      { error: "Could not store the file. Please try again." },
      { status: 500 }
    );
  }
}
