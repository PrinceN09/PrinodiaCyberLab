import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getApplication } from "@/lib/applications/application-service";
import { isApplicationError } from "@/lib/applications/errors";
import { ApplicationDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Application" };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  let app;
  try {
    app = await getApplication(user.id, id);
  } catch (e) {
    if (isApplicationError(e)) notFound();
    throw e;
  }

  const [resumes, coverLetters] = await Promise.all([
    prisma.resume.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.coverLetter.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Serialize (Date → ISO) for the client boundary.
  const data = JSON.parse(JSON.stringify(app));

  return (
    <div>
      <PageHeader
        breadcrumb="Career Center · Application Tracker"
        title={app.jobTitle}
        description={`${app.company}${app.location ? ` · ${app.location}` : ""}`}
      />
      <ApplicationDetailClient
        app={data}
        resumes={resumes}
        coverLetters={coverLetters}
      />
    </div>
  );
}
