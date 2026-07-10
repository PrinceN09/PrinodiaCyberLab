import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { NotesClient } from "./notes-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notes / Wiki" };

export default async function NotesPage() {
  const user = await getCurrentUser();
  const [notes, folders, categories] = await Promise.all([
    prisma.note.findMany({
      where: { userId: user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      include: { folder: true, category: true, tags: true },
    }),
    prisma.folder.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <NotesClient
      initialNotes={notes.map((n) => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        description: n.description,
        content: n.content,
        status: n.status,
        difficulty: n.difficulty,
        pinned: n.pinned,
        favorite: n.favorite,
        folderId: n.folderId,
        folder: n.folder ? { id: n.folder.id, name: n.folder.name } : null,
        categoryId: n.categoryId,
        category: n.category
          ? { id: n.category.id, name: n.category.name }
          : null,
        tags: n.tags.map((t) => ({ id: t.id, name: t.name })),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }))}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name }))}
      initialCategories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
