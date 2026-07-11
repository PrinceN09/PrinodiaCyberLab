/**
 * Run the job-ingestion pipeline against the database.
 *
 *   npx tsx scripts/ingest-jobs.ts                       # all enabled sources
 *   npx tsx scripts/ingest-jobs.ts --source greenhouse   # one source type
 *   npx tsx scripts/ingest-jobs.ts --source lever --identifier leverdemo
 *   npx tsx scripts/ingest-jobs.ts --dry-run             # no writes at all
 *   npx tsx scripts/ingest-jobs.ts --days 14             # widen the window (testing)
 *
 * Exit code 1 if any configured source FAILED.
 */
import type { JobSourceType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { registerAllProviders } from "../src/lib/jobs/providers";
import { runIngestion } from "../src/lib/jobs/pipeline";
import { PrismaIngestionStore } from "../src/lib/jobs/store";

const SOURCE_ALIASES: Record<string, JobSourceType> = {
  greenhouse: "GREENHOUSE",
  lever: "LEVER",
  ashby: "ASHBY",
  smartrecruiters: "SMARTRECRUITERS",
  jobbank: "JOB_BANK_CA",
  hiringcafe: "HIRING_CAFE",
  workday: "WORKDAY",
};

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const sourceArg = flag("--source");
  const sourceType = sourceArg
    ? SOURCE_ALIASES[sourceArg.toLowerCase()]
    : undefined;
  if (sourceArg && !sourceType) {
    console.error(`Unknown source "${sourceArg}".`);
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const days = flag("--days") ? Number(flag("--days")) : undefined;

  registerAllProviders();
  const summary = await runIngestion(
    {
      sourceType,
      identifier: flag("--identifier")?.toLowerCase(),
      dryRun,
      maxAgeDays: days,
    },
    { store: new PrismaIngestionStore() }
  );

  if (summary.configs.length === 0) {
    console.log(
      "No enabled sources matched. Configure one first:\n" +
        '  npx tsx scripts/manage-sources.ts add greenhouse <board-token> --label "<Company>"'
    );
    return;
  }

  console.log(
    `\nIngestion ${dryRun ? "(DRY RUN — no writes) " : ""}` +
      `window: ${summary.maxAgeDays}d · ${summary.configs.length} source(s)\n`
  );
  for (const c of summary.configs) {
    console.log(
      [
        c.status.padEnd(8),
        `${c.sourceType}:${c.identifier}`.padEnd(32),
        `found ${String(c.found).padStart(3)}`,
        `created ${String(c.created).padStart(3)}`,
        `updated ${String(c.updated).padStart(3)}`,
        `merged ${String(c.merged).padStart(3)}`,
        `skipped ${String(c.skipped).padStart(3)}`,
        c.deactivated ? `deactivated ${c.deactivated}` : "",
        c.failed ? `FAILED ITEMS ${c.failed}` : "",
        c.error ? `← ${c.error}` : "",
      ].join("  ")
    );
    for (const [reason, count] of Object.entries(c.skippedReasons)) {
      console.log(`         · skipped ${count}× — ${reason}`);
    }
  }
  console.log(
    `\nArchived ${summary.archived} expired unsaved posting(s)` +
      `${dryRun ? " (would archive)" : ""}.\n`
  );

  if (summary.configs.some((c) => c.status === "FAILED")) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.stack : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
