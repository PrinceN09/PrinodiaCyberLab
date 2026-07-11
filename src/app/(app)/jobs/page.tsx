import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/current-user";
import { parseJobQuery } from "@/lib/jobs/discovery";
import { fetchJobPage, fetchJobStats } from "@/lib/jobs/queries";
import { JobsClient } from "./jobs-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job Discovery" };

export default async function JobsPage() {
  const user = await getCurrentUser();
  const defaultQuery = parseJobQuery(new URLSearchParams());
  const [initialPage, initialStats] = await Promise.all([
    fetchJobPage(defaultQuery),
    fetchJobStats(user.id),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb="Career Center"
        title="Job Discovery"
        description="Cybersecurity roles from configured sources, posted within the last seven days and eligible for Canadian applicants — Vancouver first."
      />
      <JobsClient initialPage={initialPage} initialStats={initialStats} />
    </>
  );
}
