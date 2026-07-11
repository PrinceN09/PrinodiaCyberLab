import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Check,
  X,
  Clock,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { isDiscoverable } from "@/lib/jobs/eligibility";
import {
  formatPostingAge,
  formatSalary,
  locationPriorityLabel,
  postingAgeDays,
} from "@/lib/jobs/discovery";
import type { MatchResult } from "@/lib/jobs/matching";
import {
  EMPLOYMENT_META,
  matchTone,
  priorityTone,
  SENIORITY_LABELS,
  SOURCE_LABELS,
  WORKPLACE_META,
} from "../_components/types";
import { MatchBreakdown } from "../_components/match-breakdown";
import { SaveButton } from "./save-button";

export const dynamic = "force-dynamic";

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const job = await prisma.jobPosting.findUnique({
    where: { id },
    include: {
      sources: {
        select: {
          sourceType: true,
          sourceUrl: true,
          applicationUrl: true,
          lastSeenAt: true,
        },
      },
      applications: {
        where: { userId: user.id },
        select: { id: true, status: true },
      },
    },
  });
  if (!job) notFound();

  const application = job.applications[0] ?? null;
  const discoverable = isDiscoverable(job);
  const matchResult = job.matchBreakdown as MatchResult | null;
  const age = postingAgeDays(job.sourcePostedAt, job.firstSeenAt);
  const salary = formatSalary(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
    job.salaryPeriod
  );
  const workplace = WORKPLACE_META[job.workplaceType];
  const employment = EMPLOYMENT_META[job.employmentType];

  const eligibilityRows: { label: string; ok: boolean }[] = [
    { label: "Open to applicants in Canada", ok: job.acceptsCanadianApplicants },
    { label: "No US residency requirement", ok: !job.requiresUSResidency },
    { label: "No US citizenship requirement", ok: !job.requiresCitizenship },
    {
      label: "No security-clearance requirement",
      ok: !job.requiresSecurityClearance,
    },
  ];

  return (
    <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
      <Link
        href="/jobs"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-cds-text-secondary transition-colors hover:text-cds-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to Job
        Discovery
      </Link>

      {(!discoverable || !job.isActive) && (
        <div
          role="status"
          className="mb-4 border border-cds-yellow/40 bg-cds-yellow/10 px-4 py-3 text-xs text-cds-text-secondary"
        >
          {job.isActive
            ? "This posting no longer meets your eligibility criteria (it may have become US-only or gained clearance requirements). It's retained here because you saved or applied to it."
            : "This posting is archived — it aged past the seven-day window or was removed at the source."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        {/* MAIN */}
        <div className="min-w-0">
          <div className="border border-cds-border bg-cds-layer p-6">
            <div className="flex items-start gap-4">
              {job.companyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={job.companyLogo}
                  alt=""
                  className="h-12 w-12 shrink-0 border border-cds-border object-contain"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center border border-cds-border bg-cds-layer-accent"
                >
                  <Building2 className="h-5 w-5 text-cds-helper" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-cds-text">
                  {job.title}
                </h1>
                <div className="mt-0.5 text-sm text-cds-text-secondary">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {job.matchScore !== null && (
                    <Badge tone={matchTone(job.matchScore)}>
                      {job.matchScore} match
                    </Badge>
                  )}
                  <Badge tone={priorityTone(job.locationPriority)}>
                    {locationPriorityLabel(job.locationPriority)}
                  </Badge>
                  <Badge tone={workplace.tone}>{workplace.label}</Badge>
                  <Badge tone={employment.tone}>{employment.label}</Badge>
                  {job.seniority !== "UNKNOWN" && (
                    <Badge tone="gray">{SENIORITY_LABELS[job.seniority]}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-cds-border pt-4 text-2xs text-cds-helper">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Posted {formatPostingAge(age)}
                {!job.sourcePostedAt && " (first seen — source has no date)"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                Verified {formatDate(job.lastVerifiedAt)}
              </span>
              {job.expiresAt && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  Application deadline {formatDate(job.expiresAt)}
                </span>
              )}
              {salary && <span>{salary}</span>}
            </div>
          </div>

          {matchResult && (
            <div className="mt-4">
              <MatchBreakdown result={matchResult} />
            </div>
          )}

          <section
            aria-label="Job description"
            className="mt-4 border border-cds-border bg-cds-layer p-6"
          >
            <h2 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
              Description
            </h2>
            {job.description ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-cds-text-secondary">
                {job.description}
              </div>
            ) : (
              <p className="text-sm text-cds-helper">
                The source didn&apos;t provide a description — check the
                original posting.
              </p>
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-2 border border-cds-border bg-cds-layer p-4">
            {job.applicationUrl && (
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-10 w-full items-center justify-center gap-2 bg-cds-blue px-4 text-sm font-medium text-white transition-colors hover:bg-cds-blue-hover"
              >
                Apply now <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            <SaveButton
              postingId={job.id}
              application={application}
            />
          </div>

          <div className="border border-cds-border bg-cds-layer p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Location eligibility
            </h2>
            <ul className="space-y-2">
              {eligibilityRows.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center gap-2 text-xs text-cds-text-secondary"
                >
                  {row.ok ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-cds-green" aria-hidden="true" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0 text-cds-red" aria-hidden="true" />
                  )}
                  {row.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-cds-border bg-cds-layer p-4">
            <h2 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
              Discovered on
            </h2>
            <ul className="space-y-2">
              {job.sources.map((s) => (
                <li key={s.sourceUrl}>
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1.5 text-xs text-cds-link hover:underline"
                  >
                    {SOURCE_LABELS[s.sourceType] ?? s.sourceType}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                  <span className="text-2xs text-cds-helper">
                    last seen {formatDate(s.lastSeenAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
