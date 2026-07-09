import {
  CalendarCheck,
  Clock,
  NotebookText,
  FileWarning,
  Target,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressBar } from "@/components/ui/progress";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly Review" };

export default async function WeeklyReviewPage() {
  const weekAgo = new Date(Date.now() - 7 * 864e5);

  const [sessions, notes, reports, goals] = await Promise.all([
    prisma.studySession.findMany({ where: { date: { gte: weekAgo } } }),
    prisma.note.findMany({
      where: { updatedAt: { gte: weekAgo } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.report.count({ where: { updatedAt: { gte: weekAgo } } }),
    prisma.studyGoal.findMany({ where: { active: true } }),
  ]);

  const weekMinutes = sessions.reduce((s, x) => s + x.minutes, 0);
  const weeklyTarget = 21.5;
  const attainment = Math.min(
    100,
    Math.round((weekMinutes / 60 / weeklyTarget) * 100)
  );

  // Top topics this week
  const topicMap: Record<string, number> = {};
  for (const s of sessions) topicMap[s.topic] = (topicMap[s.topic] ?? 0) + s.minutes;
  const topics = Object.entries(topicMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        breadcrumb="Progress"
        title="Weekly Review"
        description="A snapshot of the last seven days — hours, focus areas, and goal attainment."
      />

      <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden border border-cds-border bg-cds-border lg:grid-cols-4">
          <StatCard label="Hours studied" value={`${(weekMinutes / 60).toFixed(1)}h`} icon={Clock} hint={`of ${weeklyTarget}h target`} />
          <StatCard label="Sessions" value={sessions.length} icon={CalendarCheck} />
          <StatCard label="Notes updated" value={notes.length} icon={NotebookText} />
          <StatCard label="Reports touched" value={reports} icon={FileWarning} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cds-blue" /> Focus Areas
              </CardTitle>
            </CardHeader>
            <CardBody>
              {topics.length === 0 ? (
                <p className="text-sm text-cds-helper">
                  No study sessions logged this week yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {topics.map(([topic, minutes]) => {
                    const pct = Math.round((minutes / (topics[0][1] || 1)) * 100);
                    return (
                      <div key={topic}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="text-cds-text-secondary">{topic}</span>
                          <span className="tabular-nums text-cds-helper">
                            {(minutes / 60).toFixed(1)}h
                          </span>
                        </div>
                        <ProgressBar value={pct} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cds-blue" /> Weekly Goal
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-semibold text-cds-text">
                    {attainment}%
                  </span>
                  <span className="text-2xs text-cds-helper">
                    {(weekMinutes / 60).toFixed(1)}h / {weeklyTarget}h
                  </span>
                </div>
                <ProgressBar
                  value={attainment}
                  tone={attainment >= 100 ? "green" : "blue"}
                  className="mt-2"
                />
              </div>
              <div className="divide-y divide-cds-border border-t border-cds-border">
                {goals.map((g) => {
                  const pct =
                    g.target > 0
                      ? Math.min(100, Math.round((g.current / g.target) * 100))
                      : 0;
                  return (
                    <div key={g.id} className="py-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-cds-text-secondary">{g.title}</span>
                        <span className="tabular-nums text-cds-helper">{pct}%</span>
                      </div>
                      <ProgressBar value={pct} className="mt-1.5" />
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notes touched this week</CardTitle>
          </CardHeader>
          <div className="divide-y divide-cds-border">
            {notes.length === 0 ? (
              <p className="px-5 py-4 text-sm text-cds-helper">
                No notes updated this week.
              </p>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="text-sm text-cds-text-secondary">
                    {n.title}
                  </span>
                  <span className="text-2xs text-cds-helper">
                    {relativeTime(n.updatedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
