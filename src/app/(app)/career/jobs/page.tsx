import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { JobsClient } from "./jobs-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job Tracker" };

export default async function JobsPage() {
  const jobs = await prisma.jobApplication.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Career Center"
        title="Job Tracker"
        description="Track cybersecurity roles from hiring.cafe and other boards through every stage."
      />
      <JobsClient
        initialJobs={jobs.map((j) => ({
          ...j,
          appliedDate: j.appliedDate ? j.appliedDate.toISOString() : null,
          interviewDate: j.interviewDate ? j.interviewDate.toISOString() : null,
        }))}
      />
    </div>
  );
}
