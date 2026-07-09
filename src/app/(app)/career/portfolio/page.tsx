import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PortfolioClient } from "./portfolio-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const items = await prisma.portfolioItem.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Career Center"
        title="Portfolio"
        description="Showcase the labs, detections, and write-ups that prove your hands-on skills."
      />
      <PortfolioClient initial={items} />
    </div>
  );
}
