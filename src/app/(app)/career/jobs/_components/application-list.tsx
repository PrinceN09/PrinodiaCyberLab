"use client";

import Link from "next/link";
import { ApplicationCard } from "./application-card";
import { AttentionPill, MatchPill, StatusBadge } from "./indicators";
import { topAttention } from "@/lib/applications/attention";
import type { AppDTO } from "./types";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

/**
 * Responsive application list: a table on md+ screens, stacked cards on
 * mobile. Sorting/filtering/search/pagination are handled by the parent
 * and passed down as an already-prepared page of rows.
 */
export function ApplicationList({
  apps,
  onStatusChange,
}: {
  apps: AppDTO[];
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div>
      {/* Mobile: cards */}
      <div className="grid gap-2 md:hidden">
        {apps.map((app) => (
          <ApplicationCard
            key={app.id}
            app={app}
            onChanged={({ status }) => onStatusChange(app.id, status)}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-cds-border text-left text-2xs uppercase tracking-wider text-cds-helper">
              <th scope="col" className="px-3 py-2 font-medium">Job</th>
              <th scope="col" className="px-3 py-2 font-medium">Company</th>
              <th scope="col" className="px-3 py-2 font-medium">Location</th>
              <th scope="col" className="px-3 py-2 font-medium">Match</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2 font-medium">Applied</th>
              <th scope="col" className="px-3 py-2 font-medium">Follow-up</th>
              <th scope="col" className="px-3 py-2 font-medium">Recruiter</th>
              <th scope="col" className="px-3 py-2 font-medium">Interview</th>
              <th scope="col" className="px-3 py-2 font-medium">Resume</th>
              <th scope="col" className="px-3 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => {
              const flag = topAttention(app.attention);
              return (
                <tr
                  key={app.id}
                  className="border-b border-cds-border/60 hover:bg-cds-layer-accent/40"
                >
                  <td className="max-w-[16rem] px-3 py-2.5">
                    <Link
                      href={`/career/jobs/${app.id}`}
                      className="font-medium text-cds-text hover:text-cds-link focus:outline-none focus-visible:ring-1 focus-visible:ring-cds-blue"
                    >
                      {app.jobTitle}
                    </Link>
                    {flag && (
                      <div className="mt-0.5">
                        <AttentionPill flag={flag} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-cds-text-secondary">{app.company}</td>
                  <td className="px-3 py-2.5 text-cds-text-secondary">
                    {app.location ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <MatchPill score={app.matchScore} />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-cds-text-secondary">
                    {fmt(app.appliedDate)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-cds-text-secondary">
                    {app.followUpCompleted ? "Done" : fmt(app.followUpDate)}
                  </td>
                  <td className="px-3 py-2.5 text-cds-text-secondary">
                    {app.recruiterName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-cds-text-secondary">
                    {fmt(app.nextInterviewAt)}
                  </td>
                  <td className="px-3 py-2.5 text-cds-text-secondary">
                    {app.resumeVersion ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-cds-helper">
                    {fmt(app.updatedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
