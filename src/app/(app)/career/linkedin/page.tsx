import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { LinkedInClient } from "./linkedin-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "LinkedIn Optimization" };

export default async function LinkedInPage() {
  const user = await getCurrentUser();
  const profile = await prisma.linkedInProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Career Center"
        title="LinkedIn Optimization"
        description="Craft a recruiter-ready profile and track your optimization checklist."
      />
      <LinkedInClient
        initial={
          profile
            ? {
                headline: profile.headline,
                about: profile.about,
                skills: profile.skills,
                certifications: profile.certifications,
                featured: profile.featured,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                checklist: (profile.checklist as any) ?? {},
              }
            : null
        }
      />
    </div>
  );
}
