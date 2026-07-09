import { prisma } from "@/lib/prisma";
import { NotesClient } from "./notes-client";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const notes = await prisma.note.findMany({
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: { folder: true, tags: true },
  });

  return (
    <NotesClient
      initialNotes={notes.map((n) => ({
        ...n,
        updatedAt: n.updatedAt.toISOString(),
      }))}
    />
  );
}
