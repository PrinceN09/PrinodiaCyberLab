import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { HuntClient } from "./hunt-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Threat Hunting" };

export default async function ThreatHuntingPage() {
  const hunts = await prisma.threatHunt.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <PageHeader
        breadcrumb="Cyber Operations"
        title="Threat Hunting"
        description="Hypothesis-driven hunts to proactively uncover adversary activity."
      />
      <HuntClient initial={hunts} />
    </div>
  );
}
