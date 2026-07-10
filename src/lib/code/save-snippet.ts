import { prisma } from "@/lib/prisma";
import type { CodeCategory, NoteDifficulty, Prisma } from "@prisma/client";

export const SNIPPET_LANGUAGES = [
  "python",
  "bash",
  "powershell",
  "sql",
  "javascript",
  "typescript",
  "yaml",
  "json",
  "markdown",
] as const;

export const CODE_CATEGORIES = [
  "SOC",
  "SIEM",
  "THREAT_HUNTING",
  "INCIDENT_RESPONSE",
  "VULNERABILITY_MANAGEMENT",
  "GRC",
  "PENETRATION_TESTING",
  "LINUX",
  "NETWORKING",
  "CLOUD_SECURITY",
  "DETECTION_ENGINEERING",
] as const;

const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

/** Shared relation payload so every snippets endpoint returns the same shape. */
export const SNIPPET_INCLUDE = {
  folder: true,
  tags: true,
} satisfies Prisma.CodeSnippetInclude;

export type SnippetSavePatch = {
  title?: string;
  description?: string | null;
  language?: string;
  code?: string;
  category?: CodeCategory | null;
  difficulty?: NoteDifficulty | null;
  folderId?: string | null;
  tags?: string[];
};

/**
 * Validates an untrusted request body into a SnippetSavePatch.
 * Returns null when the body is malformed. Unknown languages are
 * allowed (legacy snippets may use e.g. "go"), but must be strings.
 */
export function parseSnippetPatch(body: unknown): SnippetSavePatch | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const patch: SnippetSavePatch = {};

  for (const key of ["title", "language", "code"] as const) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== "string") return null;
      patch[key] = b[key] as string;
    }
  }
  if (b.description !== undefined) {
    if (b.description !== null && typeof b.description !== "string") return null;
    patch.description = (b.description as string | null) || null;
  }
  if (b.category !== undefined) {
    if (
      b.category !== null &&
      !CODE_CATEGORIES.includes(b.category as CodeCategory)
    ) {
      return null;
    }
    patch.category = b.category as CodeCategory | null;
  }
  if (b.difficulty !== undefined) {
    if (
      b.difficulty !== null &&
      !DIFFICULTIES.includes(b.difficulty as NoteDifficulty)
    ) {
      return null;
    }
    patch.difficulty = b.difficulty as NoteDifficulty | null;
  }
  if (b.folderId !== undefined) {
    if (b.folderId !== null && typeof b.folderId !== "string") return null;
    patch.folderId = (b.folderId as string | null) || null;
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
 * Persists a patch to a snippet owned by `userId`.
 * Mirrors saveNote: ownership-scoped, and snapshots the previous
 * state as a CodeSnippetVersion whenever title/code change.
 */
export async function saveSnippet({
  id,
  userId,
  patch,
  cause = "autosave",
}: {
  id: string;
  userId: string;
  patch: SnippetSavePatch;
  cause?: string;
}) {
  const existing = await prisma.codeSnippet.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const contentChanged =
    (patch.code !== undefined && patch.code !== existing.code) ||
    (patch.title !== undefined && patch.title !== existing.title);

  return prisma.$transaction(async (tx) => {
    if (contentChanged) {
      await tx.codeSnippetVersion.create({
        data: {
          snippetId: id,
          title: existing.title,
          code: existing.code,
          language: existing.language,
          cause,
        },
      });
    }

    return tx.codeSnippet.update({
      where: { id },
      data: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && {
          description: patch.description,
        }),
        ...(patch.language !== undefined && { language: patch.language }),
        ...(patch.code !== undefined && { code: patch.code }),
        ...(patch.category !== undefined && { category: patch.category }),
        ...(patch.difficulty !== undefined && {
          difficulty: patch.difficulty,
        }),
        ...(patch.folderId !== undefined && { folderId: patch.folderId }),
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
      include: SNIPPET_INCLUDE,
    });
  });
}
