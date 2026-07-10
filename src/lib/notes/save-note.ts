import { prisma } from "@/lib/prisma";
import type { NoteDifficulty, NoteStatus, Prisma } from "@prisma/client";

export const NOTE_STATUSES = [
  "DRAFT",
  "IN_PROGRESS",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const NOTE_DIFFICULTIES = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const;

/** Shared relation payload so every notes endpoint returns the same shape. */
export const NOTE_INCLUDE = {
  folder: true,
  category: true,
  tags: true,
  _count: { select: { attachments: true, links: true, versions: true } },
} satisfies Prisma.NoteInclude;

export type NoteSavePatch = {
  title?: string;
  summary?: string | null;
  description?: string | null;
  content?: string;
  status?: NoteStatus;
  difficulty?: NoteDifficulty | null;
  pinned?: boolean;
  favorite?: boolean;
  folderId?: string | null;
  categoryId?: string | null;
  tags?: string[];
};

function optionalString(
  value: unknown
): { ok: true; value: string | null } | { ok: false } {
  if (value === null) return { ok: true, value: null };
  if (typeof value === "string") return { ok: true, value };
  return { ok: false };
}

/**
 * Validates an untrusted request body into a NoteSavePatch.
 * Returns null when the body is malformed.
 */
export function parseNotePatch(body: unknown): NoteSavePatch | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const patch: NoteSavePatch = {};

  if (b.title !== undefined) {
    if (typeof b.title !== "string") return null;
    patch.title = b.title;
  }
  if (b.content !== undefined) {
    if (typeof b.content !== "string") return null;
    patch.content = b.content;
  }
  for (const key of ["summary", "description"] as const) {
    if (b[key] !== undefined) {
      const parsed = optionalString(b[key]);
      if (!parsed.ok) return null;
      patch[key] = parsed.value ? parsed.value : null;
    }
  }
  if (b.status !== undefined) {
    if (!NOTE_STATUSES.includes(b.status as NoteStatus)) return null;
    patch.status = b.status as NoteStatus;
  }
  if (b.difficulty !== undefined) {
    if (
      b.difficulty !== null &&
      !NOTE_DIFFICULTIES.includes(b.difficulty as NoteDifficulty)
    ) {
      return null;
    }
    patch.difficulty = b.difficulty as NoteDifficulty | null;
  }
  for (const key of ["pinned", "favorite"] as const) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== "boolean") return null;
      patch[key] = b[key] as boolean;
    }
  }
  for (const key of ["folderId", "categoryId"] as const) {
    if (b[key] !== undefined) {
      const parsed = optionalString(b[key]);
      if (!parsed.ok) return null;
      patch[key] = parsed.value || null;
    }
  }
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags) || b.tags.some((t) => typeof t !== "string")) {
      return null;
    }
    patch.tags = b.tags as string[];
  }

  return patch;
}

/**
 * Persists a patch to a note owned by `userId`.
 *
 * - Ownership-scoped: returns null when the note doesn't exist or
 *   belongs to another user.
 * - Version-aware: whenever title/content actually change, the
 *   previous state is snapshotted as a NoteVersion inside the same
 *   transaction — every save creates a version, which is what the
 *   version-history UI lists and restores from.
 */
export async function saveNote({
  id,
  userId,
  patch,
  cause = "autosave",
}: {
  id: string;
  userId: string;
  patch: NoteSavePatch;
  cause?: string;
}) {
  const existing = await prisma.note.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const contentChanged =
    (patch.content !== undefined && patch.content !== existing.content) ||
    (patch.title !== undefined && patch.title !== existing.title);

  return prisma.$transaction(async (tx) => {
    if (contentChanged) {
      await tx.noteVersion.create({
        data: {
          noteId: id,
          title: existing.title,
          content: existing.content,
          cause,
        },
      });
    }

    return tx.note.update({
      where: { id },
      data: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.summary !== undefined && { summary: patch.summary }),
        ...(patch.description !== undefined && {
          description: patch.description,
        }),
        ...(patch.content !== undefined && { content: patch.content }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.difficulty !== undefined && {
          difficulty: patch.difficulty,
        }),
        ...(patch.pinned !== undefined && { pinned: patch.pinned }),
        ...(patch.favorite !== undefined && { favorite: patch.favorite }),
        ...(patch.folderId !== undefined && { folderId: patch.folderId }),
        ...(patch.categoryId !== undefined && {
          categoryId: patch.categoryId,
        }),
        ...(patch.tags !== undefined && {
          tags: {
            set: [],
            connectOrCreate: patch.tags.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
        }),
      },
      include: NOTE_INCLUDE,
    });
  });
}
