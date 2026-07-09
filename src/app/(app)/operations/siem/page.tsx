import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { SiemClient } from "./siem-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "SIEM Rules" };

export default async function SiemPage() {
  const rules = await prisma.siemRule.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <PageHeader
        breadcrumb="Cyber Operations"
        title="SIEM Rules"
        description="Detection engineering library — correlation rules mapped to MITRE ATT&CK."
      />
      <SiemClient initial={rules} />
    </div>
  );
}
