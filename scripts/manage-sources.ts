/**
 * Manage JobSourceConfig rows from the terminal.
 *
 *   npx tsx scripts/manage-sources.ts list
 *   npx tsx scripts/manage-sources.ts add greenhouse gitlab --label "GitLab"
 *   npx tsx scripts/manage-sources.ts add lever leverdemo --label "Lever Demo"
 *   npx tsx scripts/manage-sources.ts disable greenhouse gitlab
 *   npx tsx scripts/manage-sources.ts enable greenhouse gitlab
 *   npx tsx scripts/manage-sources.ts remove greenhouse gitlab
 */
import { PrismaClient, type JobSourceType } from "@prisma/client";

const prisma = new PrismaClient();

const SOURCE_ALIASES: Record<string, JobSourceType> = {
  greenhouse: "GREENHOUSE",
  lever: "LEVER",
  ashby: "ASHBY",
  smartrecruiters: "SMARTRECRUITERS",
  jobbank: "JOB_BANK_CA",
  hiringcafe: "HIRING_CAFE",
  workday: "WORKDAY",
  employer: "EMPLOYER_DIRECT",
};

/** Only sources with implemented providers can be added today. */
const IMPLEMENTED: JobSourceType[] = ["GREENHOUSE", "LEVER"];
const UNOFFICIAL: JobSourceType[] = ["HIRING_CAFE", "WORKDAY"];

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function usage(): never {
  console.error(
    "Usage: manage-sources.ts <list|add|enable|disable|remove> [source] [identifier] [--label NAME]"
  );
  process.exit(1);
}

async function main() {
  const [, , command, sourceArg, identifier] = process.argv;

  if (command === "list") {
    const configs = await prisma.jobSourceConfig.findMany({
      orderBy: [{ sourceType: "asc" }, { identifier: "asc" }],
    });
    if (configs.length === 0) {
      console.log("No sources configured. Add one with: add greenhouse <board-token> --label <Company>");
      return;
    }
    for (const c of configs) {
      console.log(
        [
          c.enabled ? "●" : "○",
          c.sourceType.padEnd(16),
          c.identifier.padEnd(24),
          `"${c.label}"`.padEnd(28),
          c.official ? "official" : "UNOFFICIAL",
          c.lastRunAt
            ? `last: ${c.lastRunAt.toISOString().slice(0, 16)} ${c.lastStatus}`
            : "never run",
        ].join(" ")
      );
    }
    return;
  }

  const sourceType = SOURCE_ALIASES[sourceArg?.toLowerCase() ?? ""];
  if (!command || !sourceType || !identifier) usage();
  const key = { sourceType, identifier: identifier.trim().toLowerCase() };

  switch (command) {
    case "add": {
      if (!IMPLEMENTED.includes(sourceType)) {
        console.error(
          `${sourceType} has no implemented provider yet (available: ${IMPLEMENTED.join(", ")}).`
        );
        process.exit(1);
      }
      const label = flag("--label") ?? identifier;
      const config = await prisma.jobSourceConfig.upsert({
        where: { sourceType_identifier: key },
        update: { label, enabled: true },
        create: {
          ...key,
          label,
          enabled: true,
          official: !UNOFFICIAL.includes(sourceType),
        },
      });
      console.log(`Configured ${config.sourceType}:${config.identifier} ("${config.label}").`);
      return;
    }
    case "enable":
    case "disable": {
      const enabled = command === "enable";
      await prisma.jobSourceConfig.update({
        where: { sourceType_identifier: key },
        data: { enabled },
      });
      console.log(`${enabled ? "Enabled" : "Disabled"} ${sourceType}:${key.identifier}.`);
      return;
    }
    case "remove": {
      await prisma.jobSourceConfig.delete({
        where: { sourceType_identifier: key },
      });
      console.log(`Removed ${sourceType}:${key.identifier}.`);
      return;
    }
    default:
      usage();
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
