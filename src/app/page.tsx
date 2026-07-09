import Link from "next/link";
import {
  NotebookText,
  Code2,
  FolderKanban,
  FileWarning,
  GraduationCap,
  Clock,
  ArrowUpRight,
  Activity,
  Workflow,
  CircleDot,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { PROJECT_CATEGORIES, labelFor } from "@/lib/constants";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getData() {
  const [
    notes,
    snippets,
    diagrams,
    activeProjects,
    reports,
    progress,
    recentNotes,
    recentProjects,
    studyLogs,
  ] = await Promise.all([
    prisma.note.count(),
    prisma.codeSnippet.count(),
    prisma.diagram.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.report.count(),
    prisma.learningProgress.findMany({ orderBy: { order: "asc" } }),
    prisma.note.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.studyLog.findMany({ orderBy: { date: "asc" } }),
  ]);
  return {
    notes,
    snippets,
    diagrams,
    activeProjects,
    reports,
    progress,
    recentNotes,
    recentProjects,
    studyLogs,
  };
}

export default async function DashboardPage() {
  const d = await getData();

  const track = d.progress[0]?.track ?? "SOC Analyst Level 1";
  const trackAvg =
    d.progress.length > 0
      ? Math.round(
          d.progress.reduce((s, m) => s + m.progress, 0) / d.progress.length
        )
      : 0;
  const totalHours = d.progress.reduce((s, m) => s + m.hoursSpent, 0);
  const weekMinutes = d.studyLogs.reduce((s, l) => s + l.minutes, 0);
  const weekGoal = 600; // 10h/week
  const weekPct = Math.min(100, Math.round((weekMinutes / weekGoal) * 100));

  const stats = [
    { label: "Notes created", value: d.notes, icon: NotebookText, href: "/notes" },
    { label: "Code snippets saved", value: d.snippets, icon: Code2, href: "/code" },
    { label: "Active cyber projects", value: d.activeProjects, icon: FolderKanban, href: "/projects" },
    { label: "Reports written", value: d.reports, icon: FileWarning, href: "/reports" },
    { label: "Diagrams", value: d.diagrams, icon: Workflow, href: "/diagrams" },
    { label: "Study hours logged", value: `${totalHours.toFixed(0)}h`, icon: Clock, href: "/progress" },
  ];

  const maxMinutes = Math.max(...d.studyLogs.map((l) => l.minutes), 1);

  return (
    <div>
      <PageHeader
        breadcrumb="Workspace"
        title="Dashboard"
        description="Your cybersecurity learning operations at a glance."
      />

      <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-px overflow-hidden border border-cds-border bg-cds-border lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.label}
                href={s.href}
                className="group flex flex-col justify-between bg-cds-layer p-5 transition-colors hover:bg-cds-layer-accent"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-cds-helper" strokeWidth={1.75} />
                  <ArrowUpRight className="h-3.5 w-3.5 text-cds-helper opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-6">
                  <div className="text-2xl font-semibold tracking-tight text-cds-text">
                    {s.value}
                  </div>
                  <div className="mt-0.5 text-xs text-cds-text-secondary">
                    {s.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Current learning track */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-cds-blue" />
                Current Learning Track
              </CardTitle>
              <Link
                href="/progress"
                className="text-xs text-cds-link hover:underline"
              >
                View all modules
              </Link>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-lg font-semibold text-cds-text">
                    {track}
                  </div>
                  <div className="text-xs text-cds-text-secondary">
                    {d.progress.filter((m) => m.status === "COMPLETED").length} of{" "}
                    {d.progress.length} modules complete
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-cds-text">
                    {trackAvg}%
                  </div>
                  <div className="text-2xs text-cds-helper">overall</div>
                </div>
              </div>
              <ProgressBar value={trackAvg} />
              <div className="divide-y divide-cds-border border-t border-cds-border">
                {d.progress.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <CircleDot
                      className={`h-3.5 w-3.5 shrink-0 ${
                        m.status === "COMPLETED"
                          ? "text-cds-green"
                          : m.status === "IN_PROGRESS"
                          ? "text-cds-blue"
                          : "text-cds-helper"
                      }`}
                    />
                    <span className="flex-1 truncate text-sm text-cds-text-secondary">
                      {m.module}
                    </span>
                    <span className="w-24">
                      <ProgressBar
                        value={m.progress}
                        tone={m.status === "COMPLETED" ? "green" : "blue"}
                      />
                    </span>
                    <span className="w-9 text-right text-xs tabular-nums text-cds-helper">
                      {m.progress}%
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Weekly study progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cds-blue" />
                Weekly Study Progress
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-semibold text-cds-text">
                  {(weekMinutes / 60).toFixed(1)}h
                </div>
                <Badge tone={weekPct >= 100 ? "green" : "blue"}>
                  {weekPct}% of 10h goal
                </Badge>
              </div>
              <div className="mt-4 flex h-28 items-end justify-between gap-1.5">
                {d.studyLogs.map((l, i) => (
                  <div
                    key={l.id}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      className="w-full bg-cds-blue/80 transition-all hover:bg-cds-blue"
                      style={{
                        height: `${Math.max(4, (l.minutes / maxMinutes) * 100)}%`,
                      }}
                      title={`${l.minutes} min`}
                    />
                    <span className="text-2xs text-cds-helper">
                      {["S", "M", "T", "W", "T", "F", "S"][
                        new Date(l.date).getDay()
                      ]}
                    </span>
                  </div>
                )).reverse()}
              </div>
              <p className="mt-4 border-t border-cds-border pt-3 text-xs text-cds-text-secondary">
                {weekMinutes >= weekGoal
                  ? "Weekly goal met — strong momentum."
                  : `${((weekGoal - weekMinutes) / 60).toFixed(1)}h left to hit your weekly goal.`}
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-cds-blue" />
                Active Projects
              </CardTitle>
              <Link href="/projects" className="text-xs text-cds-link hover:underline">
                All projects
              </Link>
            </CardHeader>
            <div className="divide-y divide-cds-border">
              {d.recentProjects.map((p) => (
                <Link
                  key={p.id}
                  href="/projects"
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-cds-layer-accent"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-cds-text">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-2xs text-cds-helper">
                      {labelFor(PROJECT_CATEGORIES, p.category)}
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <ProgressBar value={p.progress} />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums text-cds-text-secondary">
                    {p.progress}%
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Recent notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NotebookText className="h-4 w-4 text-cds-blue" />
                Recent Notes
              </CardTitle>
              <Link href="/notes" className="text-xs text-cds-link hover:underline">
                All notes
              </Link>
            </CardHeader>
            <div className="divide-y divide-cds-border">
              {d.recentNotes.map((n) => (
                <Link
                  key={n.id}
                  href="/notes"
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-cds-layer-accent"
                >
                  <span className="truncate text-sm text-cds-text-secondary">
                    {n.title}
                  </span>
                  <span className="shrink-0 text-2xs text-cds-helper">
                    {relativeTime(n.updatedAt)}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
