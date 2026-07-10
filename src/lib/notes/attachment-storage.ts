import { mkdir, rm, writeFile } from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";

/**
 * Attachment binaries live outside the database, under
 * <project>/uploads/notes/<noteId>/<attachmentId>-<safe-name>.
 * Only metadata (Attachment model) is stored in Postgres.
 */
const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "notes");

/** MIME allowlist: PDF, Word, images/screenshots, ZIP, Markdown/text. */
export const ALLOWED_ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word",
  "image/png": "Image",
  "image/jpeg": "Image",
  "image/gif": "Image",
  "image/webp": "Image",
  "image/svg+xml": "Image",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
  "text/markdown": "Markdown",
  "text/plain": "Text",
};

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";
}

/** Writes the file to disk; returns the storage path relative to UPLOAD_ROOT. */
export async function storeAttachment(
  noteId: string,
  attachmentId: string,
  fileName: string,
  data: Buffer
): Promise<string> {
  const relative = path.join(noteId, `${attachmentId}-${safeFileName(fileName)}`);
  const absolute = path.join(UPLOAD_ROOT, relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, data);
  return relative;
}

/** Opens a read stream for a stored attachment, or null if missing. */
export function openAttachment(storagePath: string) {
  const absolute = path.join(UPLOAD_ROOT, storagePath);
  // Guard against path traversal out of the upload root.
  if (!absolute.startsWith(UPLOAD_ROOT) || !existsSync(absolute)) return null;
  return createReadStream(absolute);
}

/** Removes a single stored file (best effort). */
export async function deleteAttachmentFile(storagePath: string) {
  const absolute = path.join(UPLOAD_ROOT, storagePath);
  if (!absolute.startsWith(UPLOAD_ROOT)) return;
  await rm(absolute, { force: true });
}

/** Removes a note's entire attachment directory (best effort). */
export async function deleteNoteAttachmentDir(noteId: string) {
  const dir = path.join(UPLOAD_ROOT, noteId);
  if (!dir.startsWith(UPLOAD_ROOT)) return;
  await rm(dir, { recursive: true, force: true });
}
