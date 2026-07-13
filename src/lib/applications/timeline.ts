/**
 * ApplicationTimelineService — the append-only activity history.
 * Every major state change writes a JobApplicationEvent. History is
 * never overwritten or deleted (auditable). The event-kind catalog is
 * the single source of truth for timeline semantics and display.
 */

export const APPLICATION_EVENT_KINDS = {
  job_discovered: "Job discovered",
  job_saved: "Job saved",
  status_changed: "Status changed",
  application_reopened: "Application reopened",
  application_submitted: "Application submitted",
  resume_selected: "Resume selected",
  cover_letter_selected: "Cover letter selected",
  recruiter_added: "Recruiter added",
  recruiter_contacted: "Recruiter contacted",
  follow_up_scheduled: "Follow-up scheduled",
  follow_up_completed: "Follow-up completed",
  assessment_received: "Assessment received",
  assessment_submitted: "Assessment submitted",
  assessment_updated: "Assessment updated",
  interview_scheduled: "Interview scheduled",
  interview_rescheduled: "Interview rescheduled",
  interview_completed: "Interview completed",
  interview_cancelled: "Interview cancelled",
  offer_received: "Offer received",
  offer_updated: "Offer updated",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  archived: "Archived",
  note_added: "Note added",
} as const;

export type ApplicationEventKind = keyof typeof APPLICATION_EVENT_KINDS;

export function eventLabel(kind: string): string {
  return (
    APPLICATION_EVENT_KINDS[kind as ApplicationEventKind] ?? "Activity"
  );
}

export type TimelineEventInput = {
  kind: ApplicationEventKind;
  userId?: string | null;
  summary?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
};

/**
 * Shape the nested-create data for a JobApplicationEvent. Used both
 * standalone and inside a `create`/`update` with `events: { create }`.
 */
export function eventCreateData(input: TimelineEventInput) {
  return {
    kind: input.kind,
    userId: input.userId ?? null,
    summary: input.summary ?? eventLabel(input.kind),
    note: input.note ?? null,
    metadata: (input.metadata ?? undefined) as
      | Record<string, unknown>
      | undefined,
    occurredAt: input.occurredAt ?? new Date(),
  };
}

/** Minimal writer surface — satisfied by PrismaClient and a tx client. */
export interface TimelineWriter {
  jobApplicationEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

/**
 * Records a single timeline event against an application. Callers that
 * already hold a transaction pass the tx as the writer so the event is
 * committed atomically with the state change.
 */
export async function recordEvent(
  writer: TimelineWriter,
  applicationId: string,
  input: TimelineEventInput
): Promise<void> {
  await writer.jobApplicationEvent.create({
    data: { applicationId, ...eventCreateData(input) },
  });
}

/** Maps a status to the terminal-close event kind, if any. */
export function closeEventKind(
  status: string
): ApplicationEventKind | null {
  switch (status) {
    case "REJECTED":
      return "rejected";
    case "WITHDRAWN":
      return "withdrawn";
    case "ARCHIVED":
      return "archived";
    default:
      return null;
  }
}
