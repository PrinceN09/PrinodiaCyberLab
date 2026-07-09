import { prisma } from "@/lib/prisma";
import { CodeClient } from "./code-client";

export const dynamic = "force-dynamic";

export default async function CodePage() {
  const snippets = await prisma.codeSnippet.findMany({
    orderBy: { updatedAt: "desc" },
    include: { tags: true },
  });

  return (
    <CodeClient
      initialSnippets={snippets.map((s) => ({
        ...s,
        updatedAt: s.updatedAt.toISOString(),
      }))}
    />
  );
}
