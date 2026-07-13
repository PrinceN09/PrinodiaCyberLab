import type { AttentionFlag } from "@/lib/applications/attention";

/** A tracker row — the server maps Prisma records into this shape. */
export type AppDTO = {
  id: string;
  company: string;
  jobTitle: string;
  location: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  status: string;
  source: string;
  matchScore: number | null;
  salary: string | null;
  url: string | null;
  applicationUrl: string | null;
  jobPostingId: string | null;
  appliedDate: string | null;
  savedAt: string | null;
  lastActivityAt: string | null;
  followUpDate: string | null;
  followUpCompleted: boolean;
  recruiterName: string | null;
  resumeVersion: string | null;
  coverLetterId: string | null;
  nextInterviewAt: string | null;
  nextInterviewType: string | null;
  interviewCount: number;
  assessmentCount: number;
  offerDecision: string | null;
  attention: AttentionFlag[];
  updatedAt: string;
};

export type PickerItem = { id: string; title: string };

export type TrackerSummaryDTO = {
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
  attention: {
    applicationId: string;
    company: string;
    jobTitle: string;
    status: string;
    flag: AttentionFlag;
  }[];
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
