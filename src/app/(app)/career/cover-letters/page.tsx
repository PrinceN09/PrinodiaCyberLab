import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { CoverClient } from "./cover-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cover Letters" };

export default async function CoverLettersPage() {
  const items = await prisma.coverLetter.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Career Center"
        title="Cover Letters"
        description="Draft and tailor cover letters for each cybersecurity application."
      />
      <CoverClient
        initial={items.map((i) => ({
          ...i,
          updatedAt: i.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
