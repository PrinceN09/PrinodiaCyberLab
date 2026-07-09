import { prisma } from "@/lib/prisma";
import { DiagramsClient } from "./diagrams-client";

export const dynamic = "force-dynamic";

export default async function DiagramsPage() {
  const diagrams = await prisma.diagram.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <DiagramsClient
      initialDiagrams={diagrams.map((d) => ({
        ...d,
        updatedAt: d.updatedAt.toISOString(),
      }))}
    />
  );
}
