import Link from "next/link";
import {
  Library,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Course Library" };

const lessonIcon: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-3.5 w-3.5 text-cds-green" />,
  IN_PROGRESS: <Clock className="h-3.5 w-3.5 text-cds-blue" />,
  NOT_STARTED: <Circle className="h-3.5 w-3.5 text-cds-helper" />,
};

export default async function CourseLibraryPage() {
  const courses = await prisma.course.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { notes: { select: { id: true, title: true } } },
          },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Learning"
        title="Course Library"
        description="Track structured courses (like 10Alytics) module-by-module and link notes to lessons."
      />

      <div className="mx-auto max-w-8xl space-y-6 px-6 py-6 lg:px-8">
        {courses.length === 0 ? (
          <div className="border border-cds-border bg-cds-layer">
            <EmptyState
              icon={Library}
              title="No courses yet"
              description="Add a course and break it into modules and lessons to track your progress."
            />
          </div>
        ) : (
          courses.map((course) => {
            const allLessons = course.modules.flatMap((m) => m.lessons);
            const done = allLessons.filter((l) => l.status === "COMPLETED").length;
            return (
              <Card key={course.id}>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2">
                      <Library className="h-4 w-4 text-cds-blue" />
                      {course.title}
                    </CardTitle>
                    <div className="mt-1 text-2xs text-cds-helper">
                      {course.provider} · {done}/{allLessons.length} lessons
                      complete
                    </div>
                  </div>
                  <div className="flex w-40 items-center gap-3">
                    <ProgressBar value={course.progress} />
                    <span className="text-xs tabular-nums text-cds-text-secondary">
                      {course.progress}%
                    </span>
                  </div>
                </CardHeader>
                <div className="divide-y divide-cds-border">
                  {course.modules.map((m) => (
                    <div key={m.id} className="px-5 py-4">
                      <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                        {m.title}
                      </div>
                      <ul className="space-y-1">
                        {m.lessons.map((l) => (
                          <li
                            key={l.id}
                            className="flex items-center gap-2.5 py-1"
                          >
                            {lessonIcon[l.status]}
                            <span className="flex-1 text-sm text-cds-text-secondary">
                              {l.title}
                            </span>
                            {l.notes.length > 0 && (
                              <Link
                                href="/notes"
                                className="flex items-center gap-1 text-2xs text-cds-link hover:underline"
                              >
                                {l.notes.length} note
                                {l.notes.length > 1 ? "s" : ""}
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            )}
                            <Badge
                              tone={
                                l.status === "COMPLETED"
                                  ? "green"
                                  : l.status === "IN_PROGRESS"
                                  ? "blue"
                                  : "gray"
                              }
                            >
                              {l.status.replace("_", " ").toLowerCase()}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
