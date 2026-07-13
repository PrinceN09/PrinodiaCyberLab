import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getTrackerSummary } from "@/lib/applications/attention-service";
import { computeAttention } from "@/lib/applications/attention";
import { TrackerClient } from "./_components/tracker-client";
import type { AppDTO, TrackerSummaryDTO } from "./_components/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Application Tracker" };

const OPEN_INTERVIEW = new Set(["SCHEDULED", "RESCHEDULED"]);

export default async function TrackerPage() {
  const user = await getCurrentUser();
  const now = new Date();

  const [rows, summary] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        interviews: {
          select: { status: true, scheduledAt: true, startTime: true, type: true },
        },
        assessments: { select: { status: true, dueDate: true } },
        offer: { select: { decision: true, expiryDate: true } },
      },
    }),
    getTrackerSummary(user.id, now),
  ]);

  const apps: AppDTO[] = rows.map((a) => {
    const upcoming = a.interviews
      .map((iv) => ({ when: iv.scheduledAt ?? iv.startTime, type: iv.type, status: iv.status }))
      .filter((iv) => iv.when && OPEN_INTERVIEW.has(iv.status) && iv.when.getTime() >= now.getTime())
      .sort((x, y) => (x.when!.getTime() - y.when!.getTime()));
    const next = upcoming[0] ?? null;

    const attention = computeAttention(
      {
        status: a.status,
        followUpDate: a.followUpDate,
        followUpCompleted: a.followUpCompleted,
        lastActivityAt: a.lastActivityAt,
        interviews: a.interviews.map((iv) => ({
          status: iv.status,
          when: iv.scheduledAt ?? iv.startTime,
        })),
        assessments: a.assessments.map((as) => ({ status: as.status, dueDate: as.dueDate })),
        offer: a.offer ? { decision: a.offer.decision, expiryDate: a.offer.expiryDate } : null,
      },
      now
    );

    return {
      id: a.id,
      company: a.company,
      jobTitle: a.jobTitle,
      location: a.location,
      workplaceType: a.workplaceType,
      employmentType: a.employmentType,
      status: a.status,
      source: a.source,
      matchScore: a.matchScore,
      salary: a.salary,
      url: a.url,
      applicationUrl: a.applicationUrl,
      jobPostingId: a.jobPostingId,
      appliedDate: a.appliedDate?.toISOString() ?? null,
      savedAt: a.savedAt?.toISOString() ?? null,
      lastActivityAt: a.lastActivityAt?.toISOString() ?? null,
      followUpDate: a.followUpDate?.toISOString() ?? null,
      followUpCompleted: a.followUpCompleted,
      recruiterName: a.recruiterName ?? a.recruiter ?? null,
      resumeVersion: a.resumeVersion,
      coverLetterId: a.coverLetterId,
      nextInterviewAt: next?.when?.toISOString() ?? null,
      nextInterviewType: next?.type ?? null,
      interviewCount: a.interviews.length,
      assessmentCount: a.assessments.length,
      offerDecision: a.offer?.decision ?? null,
      attention,
      updatedAt: a.updatedAt.toISOString(),
    };
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Career Center"
        title="Application Tracker"
        description="Your personal recruitment CRM — every application from saved to offer, with interviews, assessments, follow-ups, and offers in one place."
      />
      <TrackerClient initialApps={apps} summary={summary as TrackerSummaryDTO} />
    </div>
  );
}
