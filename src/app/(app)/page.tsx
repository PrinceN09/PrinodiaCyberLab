import Link from "next/link";
import {
  NotebookText,
  Code2,
  FolderKanban,
  FileWarning,
  GraduationCap,
  Clock,
  Activity,
  Workflow,
  CircleDot,
  Briefcase,
  CalendarClock,
  Flame,
  MapPin,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { PROJECT_CATEGORIES, labelFor } from "@/lib/constants";
import { jobStatusMeta } from "@/lib/career";
import { relativeTime, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getData() {
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [
    notes,
    snippets,
    diagrams,
    activeProjects,
    reports,
    progress,
    recentNotes,
    recentProjects,
    sessions,
    recentJobs,
    upcomingInterviews,
    goals,
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
    prisma.studySession.findMany({ orderBy: { date: "desc" }, take: 30 }),
    prisma.jobApplication.findMany({ orderBy: { updatedAt: "desc" }, take: 4 }),
    prisma.jobApplication.findMany({
      where: { interviewDate: { gte: new Date() } },
      orderBy: { interviewDate: "asc" },
      take: 3,
    }),
    prisma.studyGoal.findMany({ where: { active: true }, take: 3 }),
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
    sessions,
    recentJobs,
    upcomingInterviews,
    goals,
    weekAgo,
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
  const totalHours = d.sessions.reduce((s, x) => s + x.minutes, 0) / 60;

  // Weekly study minutes from sessions
  const weekSessions = d.sessions.filter(
    (s) => new Date(s.date) >= d.weekAgo
  );
  const weekMinutes = weekSessions.reduce((s, x) => s + x.minutes, 0);
  const weekGoal = 21.5 * 60;
  const weekPct = Math.min(100, Math.round((weekMinutes / weekGoal) * 100));

  // Study streak (consecutive days with a session, ending today)
  const daySet = new Set(
    d.sessions.map((s) => new Date(s.date).toISOString().slice(0, 10))
  );
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    if (daySet.has(day)) streak++;
    else if (i === 0) continue; // allow today not-yet-studied
    else break;
  }

  // last 7 day bars
  const bars: { label: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 864e5);
    const key = day.toISOString().slice(0, 10);
    const minutes = d.sessions
      .filter((s) => new Date(s.date).toISOString().slice(0, 10) === key)
      .reduce((sum, s) => sum + s.minutes, 0);
    bars.push({ label: ["S", "M", "T", "W", "T", "F", "S"][day.getDay()], minutes });
  }
  const maxMinutes = Math.max(...bars.map((b) => b.minutes), 1);

  const stats = [
    { label: "Notes created", value: d.notes, icon: NotebookText, href: "/notes" },
    { label: "Code snippets", value: d.snippets, icon: Code2, href: "/code" },
    { label: "Active projects", value: d.activeProjects, icon: FolderKanban, href: "/projects" },
    { label: "Reports written", value: d.reports, icon: FileWarning, href: "/reports" },
    { label: "Diagrams", value: d.diagrams, icon: Workflow, href: "/diagrams" },
    { label: "Study hours", value: `${totalHours.toFixed(0)}h`, icon: Clock, href: "/progress/hours" },
  ];

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
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Current learning track */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-cds-blue" />
                Current Learning Track
              </CardTitle>
              <Link href="/progress" className="text-xs text-cds-link hover:underline">
                View all modules
              </Link>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-lg font-semibold text-cds-text">{track}</div>
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
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
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
                Weekly Study
              </CardTitle>
              <span className="flex items-center gap-1 text-2xs text-cds-orange">
                <Flame className="h-3.5 w-3.5" /> {streak}d streak
              </span>
            </CardHeader>
            <CardBody>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-semibold text-cds-text">
                  {(weekMinutes / 60).toFixed(1)}h
                </div>
                <Badge tone={weekPct >= 100 ? "green" : "blue"}>
                  {weekPct}% of 21.5h
                </Badge>
              </div>
              <div className="mt-4 flex h-28 items-end justify-between gap-1.5">
                {bars.map((b, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full bg-cds-blue/80 transition-all hover:bg-cds-blue"
                      style={{
                        height: `${Math.max(4, (b.minutes / maxMinutes) * 100)}%`,
                      }}
                      title={`${(b.minutes / 60).toFixed(1)}h`}
                    />
                    <span className="text-2xs text-cds-helper">{b.label}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/progress/hours"
                className="mt-4 block border-t border-cds-border pt-3 text-xs text-cds-link hover:underline"
              >
                View study hours →
              </Link>
            </CardBody>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Active projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-cds-blue" />
                Active Projects
              </CardTitle>
              <Link href="/projects" className="text-xs text-cds-link hover:underline">
                All
              </Link>
            </CardHeader>
            <div className="divide-y divide-cds-border">
              {d.recentProjects.map((p) => (
                <Link
                  key={p.id}
                  href="/projects"
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cds-layer-accent"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-cds-text">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-2xs text-cds-helper">
                      {labelFor(PROJECT_CATEGORIES, p.category)}
                    </div>
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums text-cds-text-secondary">
                    {p.progress}%
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Recent jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-cds-blue" />
                Recent Applications
              </CardTitle>
              <Link href="/career/jobs" className="text-xs text-cds-link hover:underline">
                Tracker
              </Link>
            </CardHeader>
            <div className="divide-y divide-cds-border">
              {d.recentJobs.length === 0 ? (
                <p className="px-5 py-4 text-xs text-cds-helper">
                  No applications yet.
                </p>
              ) : (
                d.recentJobs.map((j) => {
                  const meta = jobStatusMeta(j.status);
                  return (
                    <Link
                      key={j.id}
                      href="/career/jobs"
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cds-layer-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-cds-text">
                          {j.company}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-2xs text-cds-helper">
                          <MapPin className="h-3 w-3" />
                          {j.jobTitle}
                        </div>
                      </div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          {/* Upcoming interviews + recent notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-cds-blue" />
                Upcoming & Recent
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-cds-border">
              {d.upcomingInterviews.map((j) => (
                <Link
                  key={j.id}
                  href="/career/jobs"
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-cds-layer-accent"
                >
                  <span className="flex items-center gap-2 truncate text-sm text-cds-text-secondary">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-cds-purple" />
                    Interview · {j.company}
                  </span>
                  <span className="shrink-0 text-2xs text-cds-purple">
                    {j.interviewDate && formatDate(j.interviewDate)}
                  </span>
                </Link>
              ))}
              {d.recentNotes.slice(0, 4).map((n) => (
                <Link
                  key={n.id}
                  href="/notes"
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-cds-layer-accent"
                >
                  <span className="flex items-center gap-2 truncate text-sm text-cds-text-secondary">
                    <NotebookText className="h-3.5 w-3.5 shrink-0 text-cds-helper" />
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
