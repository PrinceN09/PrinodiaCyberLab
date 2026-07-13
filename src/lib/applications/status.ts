/**
 * Application lifecycle status metadata — the single source of truth
 * for labels, descriptions, badge tone, ordering, and active/terminal
 * classification. Pure and dependency-free (no Prisma import) so it is
 * usable in client components and unit-testable in isolation. The
 * string union mirrors the Prisma `JobStatus` enum exactly.
 */
import type { Tone } from "@/components/ui/badge";

export const APPLICATION_STATUSES = [
  "DISCOVERED",
  "SAVED",
  "PREPARING",
  "READY_TO_APPLY",
  "APPLIED",
  "RECRUITER_CONTACT",
  "ASSESSMENT",
  "INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export function isApplicationStatus(v: unknown): v is ApplicationStatus {
  return (
    typeof v === "string" &&
    (APPLICATION_STATUSES as readonly string[]).includes(v)
  );
}

/** Statuses that end the pipeline. Everything else is "active". */
export const TERMINAL_STATUSES = [
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED",
] as const satisfies readonly ApplicationStatus[];

export type StatusMeta = {
  value: ApplicationStatus;
  label: string;
  description: string;
  tone: Tone;
  /** Pipeline order; terminal states sort last. */
  order: number;
  active: boolean;
  terminal: boolean;
  /** Board column this status belongs to (terminal → null). */
  column: ApplicationStatus | null;
};

const META: Record<
  ApplicationStatus,
  Omit<StatusMeta, "value" | "active" | "terminal">
> = {
  DISCOVERED: {
    label: "Discovered",
    description: "Surfaced by job discovery; not yet saved.",
    tone: "gray",
    order: 0,
    column: "SAVED",
  },
  SAVED: {
    label: "Saved",
    description: "Bookmarked to work on. The starting point of the pipeline.",
    tone: "gray",
    order: 1,
    column: "SAVED",
  },
  PREPARING: {
    label: "Preparing",
    description: "Tailoring a resume/cover letter and researching the company.",
    tone: "cyan",
    order: 2,
    column: "PREPARING",
  },
  READY_TO_APPLY: {
    label: "Ready to Apply",
    description: "Materials are ready — awaiting submission.",
    tone: "teal",
    order: 3,
    column: "READY_TO_APPLY",
  },
  APPLIED: {
    label: "Applied",
    description: "Application submitted; waiting to hear back.",
    tone: "blue",
    order: 4,
    column: "APPLIED",
  },
  RECRUITER_CONTACT: {
    label: "Recruiter Contact",
    description: "A recruiter or coordinator has reached out.",
    tone: "cyan",
    order: 5,
    column: "RECRUITER_CONTACT",
  },
  ASSESSMENT: {
    label: "Assessment",
    description: "Completing a take-home, coding test, or lab.",
    tone: "yellow",
    order: 6,
    column: "ASSESSMENT",
  },
  INTERVIEW: {
    label: "Interview",
    description: "Actively interviewing.",
    tone: "purple",
    order: 7,
    column: "INTERVIEW",
  },
  FINAL_INTERVIEW: {
    label: "Final Interview",
    description: "Final-round or panel interview stage.",
    tone: "purple",
    order: 8,
    column: "FINAL_INTERVIEW",
  },
  OFFER: {
    label: "Offer",
    description: "An offer is on the table.",
    tone: "green",
    order: 9,
    column: "OFFER",
  },
  REJECTED: {
    label: "Rejected",
    description: "Not moving forward. Closed.",
    tone: "red",
    order: 20,
    column: null,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    description: "You withdrew from this process. Closed.",
    tone: "gray",
    order: 21,
    column: null,
  },
  ARCHIVED: {
    label: "Archived",
    description: "Filed away for reference. Closed.",
    tone: "gray",
    order: 22,
    column: null,
  },
};

export const STATUS_META: Record<ApplicationStatus, StatusMeta> =
  Object.fromEntries(
    (APPLICATION_STATUSES as readonly ApplicationStatus[]).map((value) => {
      const terminal = (TERMINAL_STATUSES as readonly string[]).includes(value);
      return [
        value,
        { value, ...META[value], active: !terminal, terminal },
      ];
    })
  ) as Record<ApplicationStatus, StatusMeta>;

export function statusMeta(value: string): StatusMeta {
  return STATUS_META[value as ApplicationStatus] ?? STATUS_META.SAVED;
}

export function isTerminal(value: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(value);
}

export function isActive(value: string): boolean {
  return isApplicationStatus(value) && !isTerminal(value);
}

/** Active statuses in pipeline order. */
export const ACTIVE_STATUSES: ApplicationStatus[] = (
  APPLICATION_STATUSES as readonly ApplicationStatus[]
)
  .filter((s) => !isTerminal(s))
  .sort((a, b) => STATUS_META[a].order - STATUS_META[b].order);

/**
 * The Kanban board columns (recommended active pipeline). DISCOVERED
 * folds into SAVED; terminal states live in the closed/filter view.
 */
export const BOARD_COLUMNS = [
  "SAVED",
  "PREPARING",
  "READY_TO_APPLY",
  "APPLIED",
  "RECRUITER_CONTACT",
  "ASSESSMENT",
  "INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
] as const satisfies readonly ApplicationStatus[];

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

/** Maps any status to the board column it renders in (or null if closed). */
export function boardColumnFor(status: string): BoardColumn | null {
  const col = STATUS_META[status as ApplicationStatus]?.column;
  return col && (BOARD_COLUMNS as readonly string[]).includes(col)
    ? (col as BoardColumn)
    : null;
}

/** Condensed pipeline used by the dashboard summary. */
export const PIPELINE_SUMMARY_STAGES: {
  key: string;
  label: string;
  statuses: ApplicationStatus[];
}[] = [
  { key: "saved", label: "Saved", statuses: ["DISCOVERED", "SAVED"] },
  {
    key: "preparing",
    label: "Preparing",
    statuses: ["PREPARING", "READY_TO_APPLY"],
  },
  { key: "applied", label: "Applied", statuses: ["APPLIED", "RECRUITER_CONTACT"] },
  {
    key: "interview",
    label: "Interview",
    statuses: ["ASSESSMENT", "INTERVIEW", "FINAL_INTERVIEW"],
  },
  { key: "offer", label: "Offer", statuses: ["OFFER"] },
];
