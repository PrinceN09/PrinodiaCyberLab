import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ResumeClient } from "./resume-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resume Builder" };

export default async function ResumePage() {
  const resumes = await prisma.resume.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Career Center"
        title="Resume Builder"
        description="Build role-targeted, export-ready resumes for cybersecurity positions."
      />
      <ResumeClient
        initialResumes={resumes.map((r) => ({
          id: r.id,
          title: r.title,
          targetRole: r.targetRole,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: (r.content ?? {}) as any,
          updatedAt: r.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
