import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsClient } from "../reports-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "GRC Reports" };

export default async function GrcReportsPage() {
  const grcTypes = ["GRC", "RISK_ASSESSMENT", "SECURITY_ASSESSMENT"] as const;
  const reports = await prisma.report.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { type: { in: grcTypes as any } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        breadcrumb="Cyber Operations"
        title="GRC Reports"
        description="Governance, risk, and compliance assessments — control gaps and recommendations."
      />
      <ReportsClient
        lockType="GRC"
        initialReports={reports.map((r) => ({
          ...r,
          updatedAt: r.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
