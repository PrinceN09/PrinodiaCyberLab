import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { IocClient } from "./ioc-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "IOC Library" };

export default async function IocPage() {
  const iocs = await prisma.ioc.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader
        breadcrumb="Cyber Operations"
        title="IOC Library"
        description="A searchable catalog of indicators of compromise from investigations and threat intel."
      />
      <IocClient initial={iocs} />
    </div>
  );
}
