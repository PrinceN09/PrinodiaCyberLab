"use client";

import Link from "next/link";
import {
  MapPin,
  Banknote,
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatPostingAge,
  formatSalary,
  locationPriorityLabel,
  postingAgeDays,
} from "@/lib/jobs/discovery";
import { jobStatusMeta } from "@/lib/career";
import {
  EMPLOYMENT_META,
  matchTone,
  priorityTone,
  SENIORITY_LABELS,
  SOURCE_LABELS,
  WORKPLACE_META,
  type JobPostingDto,
} from "./types";

export function JobCard({
  job,
  onSave,
  onUnsave,
  saving,
}: {
  job: JobPostingDto;
  onSave: (job: JobPostingDto) => void;
  onUnsave: (job: JobPostingDto) => void;
  saving: boolean;
}) {
  const age = postingAgeDays(job.sourcePostedAt, job.firstSeenAt);
  const salary = formatSalary(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
    job.salaryPeriod
  );
  const workplace = WORKPLACE_META[job.workplaceType];
  const employment = EMPLOYMENT_META[job.employmentType];
  const saved = job.application !== null;
  const progressed = saved && job.application!.status !== "SAVED";

  return (
    <article
      aria-label={`${job.title} at ${job.company}`}
      className="flex flex-col border border-cds-border bg-cds-layer p-4 transition-colors hover:border-cds-border-strong"
    >
      <div className="flex items-start gap-3">
        {job.companyLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={job.companyLogo}
            alt=""
            className="h-9 w-9 shrink-0 border border-cds-border object-contain"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-cds-border bg-cds-layer-accent"
          >
            <Building2 className="h-4 w-4 text-cds-helper" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/jobs/${job.id}`}
            className="block truncate text-sm font-semibold text-cds-text hover:text-cds-link"
          >
            {job.title}
          </Link>
          <div className="truncate text-xs text-cds-text-secondary">
            {job.company}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {job.matchScore !== null && (
            <Badge
              tone={matchTone(job.matchScore)}
              aria-label={`Match score ${job.matchScore} out of 100`}
            >
              {job.matchScore} match
            </Badge>
          )}
          <span className="flex items-center gap-1 text-2xs text-cds-helper">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span title={job.sourcePostedAt ? "Original posting date" : "First seen (source has no posting date)"}>
              {formatPostingAge(age)}
            </span>
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={priorityTone(job.locationPriority)}>
          {locationPriorityLabel(job.locationPriority)}
        </Badge>
        <Badge tone={workplace.tone}>{workplace.label}</Badge>
        <Badge tone={employment.tone}>{employment.label}</Badge>
        {job.seniority !== "UNKNOWN" && (
          <Badge tone="gray">{SENIORITY_LABELS[job.seniority]}</Badge>
        )}
      </div>

      <div className="mt-2.5 space-y-1">
        {job.location && (
          <div className="flex items-center gap-1.5 text-2xs text-cds-helper">
            <MapPin className="h-3 w-3" aria-hidden="true" /> {job.location}
          </div>
        )}
        {salary && (
          <div className="flex items-center gap-1.5 text-2xs text-cds-helper">
            <Banknote className="h-3 w-3" aria-hidden="true" /> {salary}
          </div>
        )}
        <div className="text-2xs text-cds-helper">
          via {job.sources.map((s) => SOURCE_LABELS[s.sourceType] ?? s.sourceType).join(", ")}
        </div>
        {(job.matchedSkills.length > 0 || job.missingSkills.length > 0) && (
          <div className="flex flex-wrap items-center gap-1 pt-1">
            {job.matchedSkills.slice(0, 3).map((s) => (
              <span
                key={`m-${s}`}
                className="border border-cds-green/40 bg-cds-green/10 px-1.5 py-0.5 text-2xs text-cds-green"
                title={`You have: ${s}`}
              >
                ✓ {s}
              </span>
            ))}
            {job.missingSkills.slice(0, 2).map((s) => (
              <span
                key={`x-${s}`}
                className="border border-cds-border px-1.5 py-0.5 text-2xs text-cds-helper"
                title={`Missing: ${s}`}
              >
                + {s}
              </span>
            ))}
            {job.missingSkillCount !== null && job.missingSkillCount > 2 && (
              <span className="text-2xs text-cds-helper">
                +{job.missingSkillCount - 2} more gaps
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        {progressed ? (
          <Badge tone={jobStatusMeta(job.application!.status).tone}>
            {jobStatusMeta(job.application!.status).label}
          </Badge>
        ) : (
          <button
            onClick={() => (saved ? onUnsave(job) : onSave(job))}
            disabled={saving}
            aria-pressed={saved}
            aria-label={saved ? `Unsave ${job.title}` : `Save ${job.title}`}
            className="flex h-8 items-center gap-1.5 border border-cds-border px-2.5 text-xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text disabled:opacity-50"
          >
            {saved ? (
              <>
                <BookmarkCheck className="h-3.5 w-3.5 text-cds-blue" /> Saved
              </>
            ) : (
              <>
                <Bookmark className="h-3.5 w-3.5" /> Save
              </>
            )}
          </button>
        )}
        <span className="flex-1" />
        <Link
          href={`/jobs/${job.id}`}
          className="flex h-8 items-center border border-cds-border-strong px-3 text-xs font-medium text-cds-text transition-colors hover:bg-cds-layer-accent"
        >
          Details
        </Link>
        {job.applicationUrl && (
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex h-8 items-center gap-1.5 bg-cds-blue px-3 text-xs font-medium text-white transition-colors hover:bg-cds-blue-hover"
          >
            Apply <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
