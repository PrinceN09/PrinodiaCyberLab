/**
 * Attention engine — pure, server-side classification of applications
 * that need the user's attention. No Prisma, no I/O: a snapshot plus
 * `now` in, a list of attention flags out. Phase 6 only DISPLAYS these;
 * notification delivery is a later phase.
 */
import { isTerminal } from "./status";

export const ATTENTION_KINDS = [
  "FOLLOW_UP_OVERDUE",
  "FOLLOW_UP_DUE_TODAY",
  "INTERVIEW_TODAY",
  "INTERVIEW_TOMORROW",
  "ASSESSMENT_DUE_SOON",
  "ASSESSMENT_OVERDUE",
  "OFFER_EXPIRING",
  "NO_ACTIVITY_7_DAYS",
  "NO_ACTIVITY_14_DAYS",
] as const;

export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export type AttentionSeverity = "critical" | "warning" | "info";

export type AttentionFlag = {
  kind: AttentionKind;
  severity: AttentionSeverity;
  label: string;
  message: string;
};

const SEVERITY: Record<AttentionKind, AttentionSeverity> = {
  FOLLOW_UP_OVERDUE: "critical",
  ASSESSMENT_OVERDUE: "critical",
  INTERVIEW_TODAY: "critical",
  OFFER_EXPIRING: "critical",
  FOLLOW_UP_DUE_TODAY: "warning",
  INTERVIEW_TOMORROW: "warning",
  ASSESSMENT_DUE_SOON: "warning",
  NO_ACTIVITY_14_DAYS: "warning",
  NO_ACTIVITY_7_DAYS: "info",
};

const LABEL: Record<AttentionKind, string> = {
  FOLLOW_UP_OVERDUE: "Follow-up overdue",
  FOLLOW_UP_DUE_TODAY: "Follow-up due today",
  INTERVIEW_TODAY: "Interview today",
  INTERVIEW_TOMORROW: "Interview tomorrow",
  ASSESSMENT_DUE_SOON: "Assessment due soon",
  ASSESSMENT_OVERDUE: "Assessment overdue",
  OFFER_EXPIRING: "Offer expiring",
  NO_ACTIVITY_7_DAYS: "Quiet for 7 days",
  NO_ACTIVITY_14_DAYS: "Quiet for 14 days",
};

// ── Snapshot shape (decoupled from Prisma) ──────

export type AttentionInterview = {
  status: string; // InterviewStatus
  when: Date | null; // scheduledAt ?? startTime
};

export type AttentionAssessment = {
  status: string; // AssessmentStatus
  dueDate: Date | null;
};

export type AttentionOffer = {
  decision: string; // OfferDecision
  expiryDate: Date | null;
};

export type AttentionSnapshot = {
  status: string;
  followUpDate: Date | null;
  followUpCompleted: boolean;
  lastActivityAt: Date | null;
  interviews: AttentionInterview[];
  assessments: AttentionAssessment[];
  offer: AttentionOffer | null;
};

// ── Calendar-day helpers (local time, `now`-relative) ──

function dayIndex(d: Date): number {
  // Whole days since the Unix epoch in the runtime's local timezone.
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(local.getTime() / 86_400_000);
}

/** Calendar-day delta: target − now (0 = today, 1 = tomorrow, −1 = yesterday). */
export function calendarDaysFromNow(target: Date, now: Date): number {
  return dayIndex(target) - dayIndex(now);
}

const ASSESSMENT_DUE_SOON_DAYS = 2;
const OFFER_EXPIRING_DAYS = 3;
const OFFER_OPEN_DECISIONS = new Set(["PENDING", "NEGOTIATING"]);
const INTERVIEW_OPEN = new Set(["SCHEDULED", "RESCHEDULED"]);
const ASSESSMENT_OPEN = new Set(["NOT_STARTED", "IN_PROGRESS"]);

/**
 * Computes the attention flags for a single application snapshot.
 * Closed (terminal) applications never raise attention.
 */
export function computeAttention(
  snap: AttentionSnapshot,
  now: Date = new Date()
): AttentionFlag[] {
  if (isTerminal(snap.status)) return [];
  const kinds = new Set<AttentionKind>();

  // ── Follow-up ──
  if (snap.followUpDate && !snap.followUpCompleted) {
    const d = calendarDaysFromNow(snap.followUpDate, now);
    if (d < 0) kinds.add("FOLLOW_UP_OVERDUE");
    else if (d === 0) kinds.add("FOLLOW_UP_DUE_TODAY");
  }

  // ── Interviews (soonest upcoming open one) ──
  for (const iv of snap.interviews) {
    if (!iv.when || !INTERVIEW_OPEN.has(iv.status)) continue;
    const d = calendarDaysFromNow(iv.when, now);
    if (d === 0) kinds.add("INTERVIEW_TODAY");
    else if (d === 1) kinds.add("INTERVIEW_TOMORROW");
  }

  // ── Assessments ──
  for (const a of snap.assessments) {
    if (!a.dueDate || !ASSESSMENT_OPEN.has(a.status)) continue;
    const d = calendarDaysFromNow(a.dueDate, now);
    if (d < 0) kinds.add("ASSESSMENT_OVERDUE");
    else if (d <= ASSESSMENT_DUE_SOON_DAYS) kinds.add("ASSESSMENT_DUE_SOON");
  }

  // ── Offer expiry ──
  if (
    snap.offer &&
    snap.offer.expiryDate &&
    OFFER_OPEN_DECISIONS.has(snap.offer.decision)
  ) {
    const d = calendarDaysFromNow(snap.offer.expiryDate, now);
    if (d >= 0 && d <= OFFER_EXPIRING_DAYS) kinds.add("OFFER_EXPIRING");
  }

  // ── Inactivity (14 supersedes 7) ──
  if (snap.lastActivityAt) {
    const idle = calendarDaysFromNow(now, snap.lastActivityAt); // now − activity
    if (idle >= 14) kinds.add("NO_ACTIVITY_14_DAYS");
    else if (idle >= 7) kinds.add("NO_ACTIVITY_7_DAYS");
  }

  return [...kinds].map((kind) => ({
    kind,
    severity: SEVERITY[kind],
    label: LABEL[kind],
    message: LABEL[kind],
  }));
}

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/** Highest-priority flag for compact display (critical first). */
export function topAttention(flags: AttentionFlag[]): AttentionFlag | null {
  if (flags.length === 0) return null;
  return [...flags].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  )[0];
}

/** Convenience: does this snapshot warrant an "attention" badge? */
export function needsAttention(
  snap: AttentionSnapshot,
  now: Date = new Date()
): boolean {
  return computeAttention(snap, now).length > 0;
}
