import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { InterviewClient } from "./interview-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Interview Preparation" };

export default async function InterviewPage() {
  const items = await prisma.interviewPrep.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Career Center"
        title="Interview Preparation"
        description="Build a personal question bank and rate your confidence on each answer."
      />
      <InterviewClient
        initial={items.map((i) => ({
          id: i.id,
          category: i.category,
          question: i.question,
          answer: i.answer,
          confidence: i.confidence,
        }))}
      />
    </div>
  );
}
