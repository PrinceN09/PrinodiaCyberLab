import { CheckCircle2, Circle, Clock, GraduationCap, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

const statusMeta: Record<string, { tone: Tone; label: string; icon: any }> = {
  COMPLETED: { tone: "green", label: "Completed", icon: CheckCircle2 },
  IN_PROGRESS: { tone: "blue", label: "In progress", icon: Clock },
  NOT_STARTED: { tone: "gray", label: "Not started", icon: Circle },
};

export default async function ProgressPage() {
  const [modules, studyLogs] = await Promise.all([
    prisma.learningProgress.findMany({ orderBy: { order: "asc" } }),
    prisma.studyLog.findMany({ orderBy: { date: "asc" } }),
  ]);

  const track = modules[0]?.track ?? "Learning Track";
  const overall =
    modules.length > 0
      ? Math.round(modules.reduce((s, m) => s + m.progress, 0) / modules.length)
      : 0;
  const totalHours = modules.reduce((s, m) => s + m.hoursSpent, 0);
  const completed = modules.filter((m) => m.status === "COMPLETED").length;
  const weekMinutes = studyLogs.reduce((s, l) => s + l.minutes, 0);
  const maxMinutes = Math.max(...studyLogs.map((l) => l.minutes), 1);

  const kpis = [
    { label: "Overall completion", value: `${overall}%`, icon: Target },
    { label: "Modules completed", value: `${completed}/${modules.length}`, icon: GraduationCap },
    { label: "Total study hours", value: `${totalHours.toFixed(0)}h`, icon: Clock },
    { label: "This week", value: `${(weekMinutes / 60).toFixed(1)}h`, icon: Target },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb="Growth"
        title="Learning Progress"
        description="Track your progression through structured cybersecurity learning tracks."
      />

      <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden border border-cds-border bg-cds-border lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="bg-cds-layer p-5">
                <Icon className="h-4 w-4 text-cds-helper" strokeWidth={1.75} />
                <div className="mt-6 text-2xl font-semibold text-cds-text">
                  {k.value}
                </div>
                <div className="mt-0.5 text-xs text-cds-text-secondary">
                  {k.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{track}</CardTitle>
              <Badge tone="blue">{overall}% complete</Badge>
            </CardHeader>
            <div className="divide-y divide-cds-border">
              {modules.map((m, i) => {
                const meta = statusMeta[m.status];
                const Icon = meta.icon;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        m.status === "COMPLETED"
                          ? "text-cds-green"
                          : m.status === "IN_PROGRESS"
                          ? "text-cds-blue"
                          : "text-cds-helper"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xs tabular-nums text-cds-helper">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate text-sm font-medium text-cds-text">
                          {m.module}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <ProgressBar
                          value={m.progress}
                          tone={m.status === "COMPLETED" ? "green" : "blue"}
                          className="max-w-xs"
                        />
                        <span className="text-2xs text-cds-helper">
                          {m.hoursSpent}h
                        </span>
                      </div>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study Activity</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-2xs text-cds-helper">Last 7 days</div>
              <div className="mt-4 flex h-40 items-end justify-between gap-2">
                {studyLogs.map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="w-full bg-cds-blue/80 transition-all hover:bg-cds-blue"
                      style={{
                        height: `${Math.max(4, (l.minutes / maxMinutes) * 100)}%`,
                      }}
                      title={`${l.minutes} min — ${l.topic ?? ""}`}
                    />
                    <span className="text-2xs text-cds-helper">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][
                        new Date(l.date).getDay()
                      ]}
                    </span>
                  </div>
                )).reverse()}
              </div>
              <div className="mt-4 border-t border-cds-border pt-3 text-xs text-cds-text-secondary">
                {(weekMinutes / 60).toFixed(1)}h studied this week across{" "}
                {studyLogs.filter((l) => l.minutes > 0).length} sessions.
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
