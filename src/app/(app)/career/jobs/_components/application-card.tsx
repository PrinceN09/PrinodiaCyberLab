"use client";

import Link from "next/link";
import {
  Building2,
  CalendarClock,
  FileText,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";
import { StatusControl } from "./status-control";
import { AttentionPill, MatchPill, StatusBadge } from "./indicators";
import { topAttention } from "@/lib/applications/attention";
import type { AppDTO } from "./types";

function ageDays(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const WORKPLACE_LABEL: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ON_SITE: "On-site",
  UNKNOWN: "",
};

export function ApplicationCard({
  app,
  onChanged,
  draggable = false,
  onDragStart,
}: {
  app: AppDTO;
  onChanged: (a: { status: string }) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const flag = topAttention(app.attention);
  const age = ageDays(app.appliedDate ?? app.savedAt);
  const workplace = app.workplaceType ? WORKPLACE_LABEL[app.workplaceType] : "";

  return (
    <div
      className="group border border-cds-border bg-cds-layer p-3 transition-colors hover:border-cds-border-strong"
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/career/jobs/${app.id}`}
          className="min-w-0 flex-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-cds-blue"
        >
          <div className="truncate text-sm font-semibold text-cds-text group-hover:text-cds-link">
            {app.jobTitle}
          </div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-cds-text-secondary">
            <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            {app.company}
            {app.source === "MANUAL" && (
              <span className="ml-1 border border-cds-border px-1 text-2xs text-cds-helper">
                Manual
              </span>
            )}
          </div>
        </Link>
        <MatchPill score={app.matchScore} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-cds-text-secondary">
        {app.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {app.location}
          </span>
        )}
        {workplace && <span>{workplace}</span>}
        {app.salary && <span className="tabular-nums">{app.salary}</span>}
        {age !== null && (
          <span title="Application age">{age === 0 ? "Today" : `${age}d`}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-cds-text-secondary">
        {app.nextInterviewAt && (
          <span className="inline-flex items-center gap-1 text-cds-purple">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            Interview {shortDate(app.nextInterviewAt)}
          </span>
        )}
        {app.followUpDate && !app.followUpCompleted && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            Follow-up {shortDate(app.followUpDate)}
          </span>
        )}
        {app.recruiterName && (
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3 w-3" aria-hidden="true" />
            {app.recruiterName}
          </span>
        )}
        {app.resumeVersion && (
          <span className="inline-flex items-center gap-1" title="Attached resume">
            <FileText className="h-3 w-3" aria-hidden="true" />
            {app.resumeVersion}
          </span>
        )}
        {app.coverLetterId && (
          <span className="inline-flex items-center gap-1" title="Cover letter attached">
            <Mail className="h-3 w-3" aria-hidden="true" />
            Cover letter
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <StatusBadge status={app.status} />
        {flag && <AttentionPill flag={flag} />}
      </div>

      <div className="mt-2 border-t border-cds-border pt-2">
        <StatusControl
          applicationId={app.id}
          status={app.status}
          onChanged={onChanged}
          compact
        />
      </div>
    </div>
  );
}
