import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { GoalsClient } from "./goals-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const goals = await prisma.studyGoal.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div>
      <PageHeader
        breadcrumb="Progress"
        title="Goals"
        description="Set and track your study targets — weekly hours, daily sessions, and modules."
      />
      <GoalsClient initial={goals} />
    </div>
  );
}
