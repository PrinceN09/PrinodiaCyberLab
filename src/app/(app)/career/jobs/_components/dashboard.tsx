"use client";

import Link from "next/link";
import {
  Activity,
  Briefcase,
  CalendarClock,
  ChevronRight,
  Handshake,
  Send,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { AttentionPill } from "./indicators";
import { eventLabel } from "@/lib/applications/timeline";
import type { TrackerSummaryDTO } from "./types";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function whenLabel(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TrackerDashboard({ summary }: { summary: TrackerSummaryDTO }) {
  const s = summary.stats;
  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-cds-border bg-cds-border sm:grid-cols-4 xl:grid-cols-4">
        <StatCard label="Active applications" value={s.activeApplications} icon={Briefcase} />
        <StatCard label="Submitted" value={s.submitted} icon={Send} />
        <StatCard label="Interviews scheduled" value={s.interviewsScheduled} icon={UserCheck} />
        <StatCard label="Offers" value={s.offers} icon={Handshake} />
        <StatCard
          label="Follow-ups due"
          value={s.followUpsDue}
          icon={CalendarClock}
          hint={s.followUpsOverdue > 0 ? `${s.followUpsOverdue} overdue` : undefined}
        />
        <StatCard label="Overdue follow-ups" value={s.followUpsOverdue} icon={CalendarClock} />
        <StatCard label="This month" value={s.applicationsThisMonth} icon={Activity} />
        <StatCard
          label="Avg. match"
          value={s.averageMatchScore !== null ? `${s.averageMatchScore}%` : "—"}
          icon={TrendingUp}
        />
      </div>

      {/* Pipeline summary */}
      <div className="border border-cds-border bg-cds-layer p-4">
        <h2 className="mb-3 text-2xs font-medium uppercase tracking-wider text-cds-helper">
          Pipeline
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {summary.pipeline.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-2">
              <div className="flex min-w-[5rem] flex-col border border-cds-border bg-cds-bg px-3 py-2">
                <span className="text-lg font-semibold tabular-nums text-cds-text">
                  {stage.count}
                </span>
                <span className="text-2xs text-cds-text-secondary">{stage.label}</span>
              </div>
              {i < summary.pipeline.length - 1 && (
                <ChevronRight className="h-4 w-4 text-cds-helper" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Needs attention" icon={CalendarClock}>
          {summary.attention.length === 0 ? (
            <Empty>Nothing needs attention. Nice.</Empty>
          ) : (
            summary.attention.map((a) => (
              <Link
                key={`${a.applicationId}-${a.flag.kind}`}
                href={`/career/jobs/${a.applicationId}`}
                className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-cds-layer-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-cds-text">
                    {a.jobTitle}
                  </span>
                  <span className="block truncate text-2xs text-cds-text-secondary">
                    {a.company}
                  </span>
                </span>
                <AttentionPill flag={a.flag} />
              </Link>
            ))
          )}
        </Panel>

        <Panel title="Upcoming interviews" icon={UserCheck}>
          {summary.upcomingInterviews.length === 0 ? (
            <Empty>No interviews scheduled.</Empty>
          ) : (
            summary.upcomingInterviews.map((iv, i) => (
              <Link
                key={i}
                href={`/career/jobs/${iv.applicationId}`}
                className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-cds-layer-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-cds-text">
                    {iv.jobTitle}
                  </span>
                  <span className="block truncate text-2xs text-cds-text-secondary">
                    {iv.company} · {iv.type.replace(/_/g, " ").toLowerCase()}
                  </span>
                </span>
                <span className="shrink-0 text-2xs tabular-nums text-cds-purple">
                  {whenLabel(iv.when)}
                </span>
              </Link>
            ))
          )}
        </Panel>

        <Panel title="Recent activity" icon={Activity}>
          {summary.recentActivity.length === 0 ? (
            <Empty>No activity yet.</Empty>
          ) : (
            summary.recentActivity.map((e, i) => (
              <Link
                key={i}
                href={`/career/jobs/${e.applicationId}`}
                className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-cds-layer-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs text-cds-text">
                    {e.summary || eventLabel(e.kind)}
                  </span>
                  <span className="block truncate text-2xs text-cds-text-secondary">
                    {e.company}
                  </span>
                </span>
                <span className="shrink-0 text-2xs text-cds-helper">
                  {relTime(e.occurredAt)}
                </span>
              </Link>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-cds-border bg-cds-layer">
      <header className="flex items-center gap-2 border-b border-cds-border px-3 py-2.5">
        <Icon className="h-3.5 w-3.5 text-cds-helper" aria-hidden="true" />
        <h2 className="text-xs font-semibold text-cds-text">{title}</h2>
      </header>
      <div className="divide-y divide-cds-border/60">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-5 text-center text-2xs text-cds-helper">{children}</p>;
}
