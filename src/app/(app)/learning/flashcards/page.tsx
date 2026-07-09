import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { FlashcardsClient } from "./flashcards-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const cards = await prisma.flashcard.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div>
      <PageHeader
        breadcrumb="Learning"
        title="Flashcards"
        description="Active-recall practice for the concepts, ports, and frameworks you're learning."
      />
      <FlashcardsClient
        initial={cards.map((c) => ({
          id: c.id,
          deck: c.deck,
          front: c.front,
          back: c.back,
          confidence: c.confidence,
        }))}
      />
    </div>
  );
}
