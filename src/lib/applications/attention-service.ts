/**
 * ApplicationAttentionService — server-side aggregation for the tracker
 * dashboard: headline stats, pipeline summary, and the attention feed
 * (overdue follow-ups, upcoming interviews, due assessments, expiring
 * offers, inactivity). Pure attention rules live in ./attention; this
 * layer only loads data and assembles the view model. User-scoped.
 */
import { prisma } from "@/lib/prisma";
import {
  computeAttention,
  topAttention,
  type AttentionFlag,
  type AttentionSnapshot,
} from "./attention";
import {
  ACTIVE_STATUSES,
  PIPELINE_SUMMARY_STAGES,
  statusMeta,
  type ApplicationStatus,
} from "./status";

const ACTIVE = ACTIVE_STATUSES as readonly ApplicationStatus[];

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type TrackerAttentionItem = {
  applicationId: string;
  company: string;
  jobTitle: string;
  status: string;
  flag: AttentionFlag;
};

export type TrackerSummary = {
  stats: {
    activeApplications: number;
    submitted: number;
    interviewsScheduled: number;
    offers: number;
    followUpsDue: number;
    followUpsOverdue: number;
    applicationsThisMonth: number;
    averageMatchScore: number | null;
  };
  pipeline: { key: string; label: string; count: number }[];
  statusCounts: Record<string, number>;
  attention: TrackerAttentionItem[];
  upcomingInterviews: {
    applicationId: string;
    company: string;
    jobTitle: string;
    type: string;
    when: string | null;
  }[];
  recentActivity: {
    applicationId: string;
    kind: string;
    summary: string | null;
    occurredAt: string;
    company: string;
    jobTitle: string;
  }[];
};

export async function getTrackerSummary(
  userId: string,
  now: Date = new Date()
): Promise<TrackerSummary> {
  const [apps, grouped, matchAgg, monthCount, recentEvents] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId, status: { in: [...ACTIVE] } },
      select: {
        id: true,
        company: true,
        jobTitle: true,
        status: true,
        followUpDate: true,
        followUpCompleted: true,
        lastActivityAt: true,
        interviews: {
          select: { status: true, scheduledAt: true, startTime: true, type: true },
        },
        assessments: { select: { status: true, dueDate: true } },
        offer: { select: { decision: true, expiryDate: true } },
      },
    }),
    prisma.jobApplication.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.jobApplication.aggregate({
      where: { userId, matchScore: { not: null } },
      _avg: { matchScore: true },
    }),
    prisma.jobApplication.count({
      where: { userId, appliedDate: { gte: startOfMonth(now) } },
    }),
    prisma.jobApplicationEvent.findMany({
      where: { application: { userId } },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        kind: true,
        summary: true,
        occurredAt: true,
        application: { select: { id: true, company: true, jobTitle: true } },
      },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const g of grouped) statusCounts[g.status] = g._count._all;

  const submitted = [
    "APPLIED",
    "RECRUITER_CONTACT",
    "ASSESSMENT",
    "INTERVIEW",
    "FINAL_INTERVIEW",
    "OFFER",
  ].reduce((n, s) => n + (statusCounts[s] ?? 0), 0);

  const todayStart = startOfDay(now).getTime();
  let followUpsDue = 0;
  let followUpsOverdue = 0;
  const attention: TrackerAttentionItem[] = [];
  const upcomingInterviews: TrackerSummary["upcomingInterviews"] = [];

  for (const a of apps) {
    // Follow-up buckets.
    if (a.followUpDate && !a.followUpCompleted) {
      const day = startOfDay(a.followUpDate).getTime();
      if (day < todayStart) followUpsOverdue += 1;
      else if (day === todayStart) followUpsDue += 1;
    }
    // Upcoming interviews (open, in the future).
    for (const iv of a.interviews) {
      const when = iv.scheduledAt ?? iv.startTime;
      if (
        when &&
        (iv.status === "SCHEDULED" || iv.status === "RESCHEDULED") &&
        when.getTime() >= todayStart
      ) {
        upcomingInterviews.push({
          applicationId: a.id,
          company: a.company,
          jobTitle: a.jobTitle,
          type: iv.type,
          when: when.toISOString(),
        });
      }
    }
    // Attention flags.
    const snap: AttentionSnapshot = {
      status: a.status,
      followUpDate: a.followUpDate,
      followUpCompleted: a.followUpCompleted,
      lastActivityAt: a.lastActivityAt,
      interviews: a.interviews.map((iv) => ({
        status: iv.status,
        when: iv.scheduledAt ?? iv.startTime,
      })),
      assessments: a.assessments.map((as) => ({
        status: as.status,
        dueDate: as.dueDate,
      })),
      offer: a.offer
        ? { decision: a.offer.decision, expiryDate: a.offer.expiryDate }
        : null,
    };
    const flag = topAttention(computeAttention(snap, now));
    if (flag) {
      attention.push({
        applicationId: a.id,
        company: a.company,
        jobTitle: a.jobTitle,
        status: a.status,
        flag,
      });
    }
  }

  upcomingInterviews.sort((x, y) =>
    (x.when ?? "").localeCompare(y.when ?? "")
  );

  const interviewsScheduled = upcomingInterviews.length;
  const offers = statusCounts.OFFER ?? 0;

  const pipeline = PIPELINE_SUMMARY_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: stage.statuses.reduce((n, s) => n + (statusCounts[s] ?? 0), 0),
  }));

  const severityRank = { critical: 0, warning: 1, info: 2 } as const;
  attention.sort(
    (x, y) => severityRank[x.flag.severity] - severityRank[y.flag.severity]
  );

  return {
    stats: {
      activeApplications: apps.length,
      submitted,
      interviewsScheduled,
      offers,
      followUpsDue,
      followUpsOverdue,
      applicationsThisMonth: monthCount,
      averageMatchScore:
        matchAgg._avg.matchScore !== null
          ? Math.round(matchAgg._avg.matchScore)
          : null,
    },
    pipeline,
    statusCounts,
    attention: attention.slice(0, 12),
    upcomingInterviews: upcomingInterviews.slice(0, 6),
    recentActivity: recentEvents.map((e) => ({
      applicationId: e.application.id,
      kind: e.kind,
      summary: e.summary,
      occurredAt: e.occurredAt.toISOString(),
      company: e.application.company,
      jobTitle: e.application.jobTitle,
    })),
  };
}

/** Per-application attention flags for list/board badges (user-scoped). */
export async function getAttentionForApplications(
  userId: string,
  now: Date = new Date()
): Promise<Record<string, AttentionFlag[]>> {
  const apps = await prisma.jobApplication.findMany({
    where: { userId, status: { in: [...ACTIVE] } },
    select: {
      id: true,
      status: true,
      followUpDate: true,
      followUpCompleted: true,
      lastActivityAt: true,
      interviews: { select: { status: true, scheduledAt: true, startTime: true } },
      assessments: { select: { status: true, dueDate: true } },
      offer: { select: { decision: true, expiryDate: true } },
    },
  });
  const out: Record<string, AttentionFlag[]> = {};
  for (const a of apps) {
    const flags = computeAttention(
      {
        status: a.status,
        followUpDate: a.followUpDate,
        followUpCompleted: a.followUpCompleted,
        lastActivityAt: a.lastActivityAt,
        interviews: a.interviews.map((iv) => ({
          status: iv.status,
          when: iv.scheduledAt ?? iv.startTime,
        })),
        assessments: a.assessments.map((as) => ({
          status: as.status,
          dueDate: as.dueDate,
        })),
        offer: a.offer
          ? { decision: a.offer.decision, expiryDate: a.offer.expiryDate }
          : null,
      },
      now
    );
    if (flags.length) out[a.id] = flags;
  }
  return out;
}

/** Human labels reused by the UI without importing status internals. */
export function statusLabel(status: string): string {
  return statusMeta(status).label;
}
