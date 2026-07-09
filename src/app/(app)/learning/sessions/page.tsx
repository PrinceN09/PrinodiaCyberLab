import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { SessionsClient } from "./sessions-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Study Sessions" };

export default async function SessionsPage() {
  const [sessions, courses] = await Promise.all([
    prisma.studySession.findMany({
      orderBy: { date: "desc" },
      include: { course: { select: { title: true } } },
    }),
    prisma.course.findMany({ select: { id: true, title: true } }),
  ]);

  return (
    <div>
      <PageHeader
        breadcrumb="Learning"
        title="Study Sessions"
        description="Log focused study sessions and watch your hours accumulate toward your goals."
      />
      <SessionsClient
        initial={sessions.map((s) => ({
          id: s.id,
          date: s.date.toISOString(),
          minutes: s.minutes,
          topic: s.topic,
          focus: s.focus,
          notes: s.notes,
          course: s.course,
        }))}
        courses={courses}
      />
    </div>
  );
}
