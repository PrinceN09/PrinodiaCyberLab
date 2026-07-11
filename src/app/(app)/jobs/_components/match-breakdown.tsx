import Link from "next/link";
import { Target, Lightbulb, FolderGit2, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PROVENANCE_LABELS,
  PROVENANCE_ORDER,
  type MatchResult,
} from "@/lib/jobs/matching";
import { matchTone } from "./types";

/**
 * Transparent match-score explanation (details page). Renders the
 * persisted MatchResult — no scoring logic in the UI. Provenance
 * grouping keeps training labs clearly separated from professional
 * experience (spec honesty requirement).
 */
export function MatchBreakdown({ result }: { result: MatchResult }) {
  if (!result.eligible) {
    return (
      <section
        aria-label="Match score"
        className="border border-cds-border bg-cds-layer p-6"
      >
        <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          <Target className="h-3.5 w-3.5" aria-hidden="true" /> Match score
        </h2>
        <p className="text-sm text-cds-text-secondary">{result.reasons[0]}</p>
      </section>
    );
  }

  const grouped = PROVENANCE_ORDER.map((prov) => ({
    prov,
    skills: result.matchedSkills.filter((s) => s.provenance === prov),
  })).filter((g) => g.skills.length > 0);

  return (
    <section
      aria-label="Match score explanation"
      className="border border-cds-border bg-cds-layer p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          <Target className="h-3.5 w-3.5" aria-hidden="true" /> Match score
        </h2>
        <Badge tone={matchTone(result.score)}>{result.score} / 100</Badge>
      </div>

      {/* Component bars */}
      <dl className="space-y-2.5">
        {result.components.map((c) => (
          <div key={c.id}>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-cds-text-secondary">{c.label}</dt>
              <dd className="text-2xs tabular-nums text-cds-helper">
                {Math.round(c.score)} / {c.max}
              </dd>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.round(c.score)}
              aria-valuemin={0}
              aria-valuemax={c.max}
              aria-label={c.label}
              className="mt-1 h-1 w-full bg-cds-layer-accent"
            >
              <div
                className="h-1 bg-cds-blue"
                style={{ width: `${(c.score / c.max) * 100}%` }}
              />
            </div>
            <div className="mt-0.5 text-2xs text-cds-helper">{c.detail}</div>
          </div>
        ))}
      </dl>

      {/* Why */}
      <div className="mt-5 border-t border-cds-border pt-4">
        <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          Why this score
        </h3>
        <ul className="list-disc space-y-1 pl-4 text-xs text-cds-text-secondary">
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      {/* Matched skills by provenance */}
      {grouped.length > 0 && (
        <div className="mt-5 border-t border-cds-border pt-4">
          <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
            Your matching skills — by evidence type
          </h3>
          <div className="space-y-2">
            {grouped.map(({ prov, skills }) => (
              <div key={prov} className="flex flex-wrap items-center gap-1.5">
                <span className="w-44 shrink-0 text-2xs text-cds-helper">
                  {PROVENANCE_LABELS[prov]}
                </span>
                {skills.map((s) => (
                  <Badge key={s.name} tone={prov === "PROFESSIONAL" ? "green" : "blue"}>
                    {s.name}
                    {s.required ? "" : " (preferred)"}
                  </Badge>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing skills */}
      {result.missingSkills.length > 0 && (
        <div className="mt-5 border-t border-cds-border pt-4">
          <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
            Missing skills ({result.missingRequiredCount} required)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.missingSkills.map((s) => (
              <Badge key={s.name} tone={s.required ? "yellow" : "gray"}>
                {s.name}
                {s.required ? "" : " (preferred)"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.gaps.length > 0 && (
        <div className="mt-5 border-t border-cds-border pt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            Preparation recommendations
          </h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-cds-text-secondary">
            {result.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Related evidence */}
      {(result.relatedRepos.length > 0 || result.relatedProjects.length > 0) && (
        <div className="mt-5 border-t border-cds-border pt-4">
          <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
            Relevant portfolio evidence
          </h3>
          <ul className="space-y-1.5">
            {result.relatedRepos.map((r) => (
              <li key={r.id} className="flex items-center gap-1.5 text-xs">
                <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-cds-helper" aria-hidden="true" />
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-cds-link hover:underline"
                >
                  {r.fullName}
                </a>
                <span className="text-2xs text-cds-helper">— {r.reason}</span>
              </li>
            ))}
            {result.relatedProjects.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5 text-xs">
                <FlaskConical className="h-3.5 w-3.5 shrink-0 text-cds-helper" aria-hidden="true" />
                <Link href="/projects" className="text-cds-link hover:underline">
                  {p.title}
                </Link>
                <span className="text-2xs text-cds-helper">
                  ({p.kind === "lab" ? "training lab" : "project"}) — {p.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
