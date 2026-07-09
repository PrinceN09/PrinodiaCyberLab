import { prisma } from "@/lib/prisma";
import { NotesClient } from "./notes-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notes / Wiki" };

export default async function NotesPage() {
  const [notes, folders] = await Promise.all([
    prisma.note.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      include: { folder: true, tags: true },
    }),
    prisma.folder.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <NotesClient
      initialNotes={notes.map((n) => ({
        id: n.id,
        title: n.title,
        category: n.category,
        description: n.description,
        content: n.content,
        pinned: n.pinned,
        folderId: n.folderId,
        folder: n.folder ? { id: n.folder.id, name: n.folder.name } : null,
        tags: n.tags.map((t) => ({ id: t.id, name: t.name })),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }))}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name }))}
    />
  );
}
