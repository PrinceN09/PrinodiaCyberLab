import {
  AlertTriangle,
  Archive,
  Award,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Handshake,
  PhoneCall,
  Send,
  Sparkles,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusMeta } from "@/lib/applications/status";
import type { AttentionFlag, AttentionSeverity } from "@/lib/applications/attention";

/** Icon per status so state is never conveyed by color alone. */
const STATUS_ICON: Record<string, LucideIcon> = {
  DISCOVERED: Sparkles,
  SAVED: Bookmark,
  PREPARING: ClipboardList,
  READY_TO_APPLY: FileCheck2,
  APPLIED: Send,
  RECRUITER_CONTACT: PhoneCall,
  ASSESSMENT: ClipboardList,
  INTERVIEW: UserCheck,
  FINAL_INTERVIEW: Award,
  OFFER: Handshake,
  REJECTED: XCircle,
  WITHDRAWN: Archive,
  ARCHIVED: Archive,
};

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  const Icon = STATUS_ICON[status] ?? CheckCircle2;
  return (
    <Badge tone={meta.tone}>
      <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      <span>{meta.label}</span>
    </Badge>
  );
}

const SEVERITY_TONE: Record<AttentionSeverity, string> = {
  critical: "text-cds-red",
  warning: "text-cds-orange",
  info: "text-cds-helper",
};

export function AttentionPill({ flag }: { flag: AttentionFlag }) {
  const Icon = flag.severity === "info" ? CalendarClock : AlertTriangle;
  return (
    <span
      className={`inline-flex items-center gap-1 text-2xs font-medium ${SEVERITY_TONE[flag.severity]}`}
      title={flag.message}
    >
      <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      {flag.label}
    </span>
  );
}

export function MatchPill({ score }: { score: number | null }) {
  if (score === null) return null;
  const tone =
    score >= 75 ? "text-cds-green" : score >= 55 ? "text-cds-blue" : "text-cds-helper";
  return (
    <span className={`text-2xs font-semibold tabular-nums ${tone}`} title="Match score">
      {score}% match
    </span>
  );
}
