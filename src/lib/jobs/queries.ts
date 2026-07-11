/**
 * Server-side discovery queries shared by API routes and server
 * components (single implementation — no logic drift between the
 * dashboard's initial render and client refetches).
 */
import { prisma } from "@/lib/prisma";
import {
  buildJobOrderBy,
  buildJobWhere,
  DISCOVERABLE_WHERE,
  type JobQuery,
} from "./discovery";
import { POSTING_LIST_SELECT, toPostingDto } from "./posting-dto";

export async function fetchJobPage(query: JobQuery) {
  const where = buildJobWhere(query);
  const [items, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      orderBy: buildJobOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: POSTING_LIST_SELECT,
    }),
    prisma.jobPosting.count({ where }),
  ]);
  return {
    items: items.map(toPostingDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function fetchJobStats(userId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    newToday,
    lastSevenDays,
    remoteCanada,
    vancouver,
    applicationsInProgress,
    interviews,
  ] = await Promise.all([
    prisma.jobPosting.count({
      where: { ...DISCOVERABLE_WHERE, firstSeenAt: { gte: startOfToday } },
    }),
    prisma.jobPosting.count({ where: DISCOVERABLE_WHERE }),
    prisma.jobPosting.count({
      where: {
        ...DISCOVERABLE_WHERE,
        workplaceType: "REMOTE",
        locationPriority: { lte: 5 },
      },
    }),
    prisma.jobPosting.count({
      where: { ...DISCOVERABLE_WHERE, locationPriority: { lte: 2 } },
    }),
    prisma.jobApplication.count({
      where: {
        userId,
        status: {
          in: [
            "PREPARING",
            "READY_TO_APPLY",
            "APPLIED",
            "RECRUITER_CONTACT",
            "ASSESSMENT",
          ],
        },
      },
    }),
    prisma.jobApplication.count({
      where: { userId, status: { in: ["INTERVIEW", "FINAL_INTERVIEW"] } },
    }),
  ]);

  return {
    newToday,
    lastSevenDays,
    remoteCanada,
    vancouver,
    applicationsInProgress,
    interviews,
  };
}

export type JobStats = Awaited<ReturnType<typeof fetchJobStats>>;
