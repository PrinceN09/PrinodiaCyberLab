/**
 * Dev CLI: run one job-source provider end-to-end WITHOUT touching
 * the database. Fetch → normalize → eligibility, printed as a table.
 *
 *   npx tsx scripts/fetch-source.ts greenhouse gitlab
 *   npx tsx scripts/fetch-source.ts lever leverdemo --label "Lever Demo"
 *   npx tsx scripts/fetch-source.ts greenhouse arcticwolf --days 14
 */
import type { JobSourceType } from "@prisma/client";
import { registerAllProviders } from "../src/lib/jobs/providers";
import { getProvider, isProviderAllowed } from "../src/lib/jobs/registry";
import { normalizeJob } from "../src/lib/jobs/normalize";
import { evaluateEligibility, JOB_MAX_AGE_DAYS } from "../src/lib/jobs/eligibility";

const SOURCE_ALIASES: Record<string, JobSourceType> = {
  greenhouse: "GREENHOUSE",
  lever: "LEVER",
  ashby: "ASHBY",
  smartrecruiters: "SMARTRECRUITERS",
  jobbank: "JOB_BANK_CA",
  hiringcafe: "HIRING_CAFE",
  workday: "WORKDAY",
};

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [, , sourceArg, identifier] = process.argv;
  const sourceType = SOURCE_ALIASES[sourceArg?.toLowerCase() ?? ""];
  if (!sourceType || !identifier) {
    console.error(
      "Usage: npx tsx scripts/fetch-source.ts <greenhouse|lever> <identifier> [--label NAME] [--days N]"
    );
    process.exit(1);
  }

  registerAllProviders();
  const provider = getProvider(sourceType);
  if (!provider) {
    console.error(`No provider implemented for ${sourceType} yet.`);
    process.exit(1);
  }
  if (!isProviderAllowed(provider)) {
    console.error(
      `${sourceType} is an unofficial provider and is disabled. ` +
        `Review its compliance note before enabling via env.`
    );
    process.exit(1);
  }

  const days = Number(arg("--days") ?? JOB_MAX_AGE_DAYS);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  console.log(`\n${provider.complianceNote}\n`);
  console.log(`Fetching ${sourceType}:${identifier} (window: ${days}d)…\n`);

  const raws = await provider.fetchJobs(identifier, {
    since,
    sourceLabel: arg("--label"),
    log: (m) => console.log(`  [log] ${m}`),
  });

  const now = new Date();
  let eligible = 0;
  for (const raw of raws) {
    const job = normalizeJob(raw);
    const verdict = evaluateEligibility(
      { ...job, sourcePostedAt: job.sourcePostedAt },
      { now, firstSeenAt: now }
    );
    if (verdict.eligible) eligible++;
    const age = job.sourcePostedAt
      ? `${Math.round((now.getTime() - job.sourcePostedAt.getTime()) / 86_400_000)}d`
      : "?";
    console.log(
      [
        verdict.eligible ? "✓" : "✗",
        `[P${String(verdict.locationPriority).padStart(2)}]`,
        job.title.slice(0, 48).padEnd(48),
        (job.location ?? "—").slice(0, 28).padEnd(28),
        `${job.workplaceType}/${job.employmentType}`.padEnd(20),
        age.padStart(3),
        verdict.reasons.length ? ` ← ${verdict.reasons.join("; ")}` : "",
      ].join(" ")
    );
  }

  console.log(
    `\n${raws.length} jobs in window · ${eligible} eligible under default filters\n`
  );
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
