import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { CodeClient } from "./code-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Code Workspace" };

export default async function CodePage() {
  const user = await getCurrentUser();
  const [snippets, folders] = await Promise.all([
    prisma.codeSnippet.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { folder: true, tags: true },
    }),
    prisma.codeFolder.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <CodeClient
      initialSnippets={snippets.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        language: s.language,
        code: s.code,
        category: s.category,
        difficulty: s.difficulty,
        folderId: s.folderId,
        folder: s.folder ? { id: s.folder.id, name: s.folder.name } : null,
        tags: s.tags.map((t) => ({ id: t.id, name: t.name })),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name }))}
    />
  );
}
