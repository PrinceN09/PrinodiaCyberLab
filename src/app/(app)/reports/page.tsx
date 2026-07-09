import { prisma } from "@/lib/prisma";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <ReportsClient
      initialReports={reports.map((r) => ({
        ...r,
        updatedAt: r.updatedAt.toISOString(),
      }))}
    />
  );
}
