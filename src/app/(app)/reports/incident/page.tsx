import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsClient } from "../reports-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Incident Reports" };

export default async function IncidentReportsPage() {
  const reports = await prisma.report.findMany({
    where: { type: "INCIDENT_RESPONSE" },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        breadcrumb="Cyber Operations"
        title="Incident Reports"
        description="Document security incidents with timelines, impact, and remediation."
      />
      <ReportsClient
        lockType="INCIDENT_RESPONSE"
        initialReports={reports.map((r) => ({
          ...r,
          updatedAt: r.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
