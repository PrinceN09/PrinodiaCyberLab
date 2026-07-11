/**
 * PrismaIngestionStore — the production IngestionStore. All database
 * access for the ingestion pipeline lives here; the pipeline itself
 * never imports Prisma.
 */
import type { ImportRunStatus, JobSourceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  pickPreferredApplyLink,
  type DedupRecord,
  type IngestionStore,
  type PostingWriteFields,
  type SourceConfigRecord,
  type SourceWriteFields,
} from "./pipeline";

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class PrismaIngestionStore implements IngestionStore {
  async listConfigs(filter: {
    sourceType?: JobSourceType;
    identifier?: string;
  }): Promise<SourceConfigRecord[]> {
    const configs = await prisma.jobSourceConfig.findMany({
      where: {
        enabled: true,
        ...(filter.sourceType && { sourceType: filter.sourceType }),
        ...(filter.identifier && { identifier: filter.identifier }),
      },
      orderBy: [{ sourceType: "asc" }, { identifier: "asc" }],
    });
    return configs.map((c) => ({
      id: c.id,
      sourceType: c.sourceType,
      identifier: c.identifier,
      label: c.label,
    }));
  }

  async startRun(config: SourceConfigRecord): Promise<string> {
    const run = await prisma.importRun.create({
      data: { sourceType: config.sourceType, configId: config.id },
      select: { id: true },
    });
    return run.id;
  }

  async finishRun(
    runId: string,
    patch: {
      status: ImportRunStatus;
      finishedAt: Date;
      jobsFound: number;
      jobsCreated: number;
      jobsUpdated: number;
      jobsArchived: number;
      error?: string | null;
      details?: unknown;
    }
  ): Promise<void> {
    await prisma.importRun.update({
      where: { id: runId },
      data: {
        status: patch.status,
        finishedAt: patch.finishedAt,
        jobsFound: patch.jobsFound,
        jobsCreated: patch.jobsCreated,
        jobsUpdated: patch.jobsUpdated,
        jobsArchived: patch.jobsArchived,
        error: patch.error ?? null,
        details: asJson(patch.details),
      },
    });
  }

  async updateConfigStatus(
    configId: string,
    status: ImportRunStatus,
    at: Date
  ): Promise<void> {
    await prisma.jobSourceConfig.update({
      where: { id: configId },
      data: { lastStatus: status, lastRunAt: at },
    });
  }

  async findSource(sourceType: JobSourceType, sourceUrl: string) {
    return prisma.jobPostingSource.findUnique({
      where: { sourceType_sourceUrl: { sourceType, sourceUrl } },
      select: { id: true, jobPostingId: true },
    });
  }

  async touchSource(sourceId: string, raw: unknown, at: Date): Promise<void> {
    await prisma.jobPostingSource.update({
      where: { id: sourceId },
      data: { lastSeenAt: at, raw: asJson(raw) },
    });
  }

  async refreshPosting(
    postingId: string,
    fields: PostingWriteFields,
    at: Date
  ): Promise<void> {
    await prisma.jobPosting.update({
      where: { id: postingId },
      data: { ...fields, lastVerifiedAt: at },
    });
  }

  async findDedupCandidates(
    normalizedCompany: string,
    sourceType: JobSourceType
  ): Promise<DedupRecord[]> {
    const postings = await prisma.jobPosting.findMany({
      where: { normalizedCompany, isActive: true },
      select: {
        id: true,
        normalizedCompany: true,
        normalizedTitle: true,
        city: true,
        workplaceType: true,
        applicationUrl: true,
        description: true,
        sources: { select: { sourceType: true, sourceJobId: true } },
      },
      take: 200,
    });
    return postings.map((p) => ({
      id: p.id,
      normalizedCompany: p.normalizedCompany,
      normalizedTitle: p.normalizedTitle,
      city: p.city,
      workplaceType: p.workplaceType,
      applicationUrl: p.applicationUrl,
      // Employer job ids only match within the same source type.
      sourceJobId:
        p.sources.find((s) => s.sourceType === sourceType)?.sourceJobId ?? null,
      description: p.description,
    }));
  }

  async attachSource(
    postingId: string,
    source: SourceWriteFields,
    at: Date
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.jobPostingSource.create({
        data: {
          jobPostingId: postingId,
          sourceType: source.sourceType,
          sourceJobId: source.sourceJobId,
          sourceUrl: source.sourceUrl,
          applicationUrl: source.applicationUrl,
          raw: asJson(source.raw),
          importedAt: at,
          lastSeenAt: at,
        },
      });
      const sources = await tx.jobPostingSource.findMany({
        where: { jobPostingId: postingId },
        select: { sourceType: true, applicationUrl: true },
      });
      await tx.jobPosting.update({
        where: { id: postingId },
        data: {
          lastVerifiedAt: at,
          applicationUrl: pickPreferredApplyLink(sources),
        },
      });
    });
  }

  async createPosting(
    fields: PostingWriteFields,
    source: SourceWriteFields,
    at: Date
  ): Promise<string> {
    const posting = await prisma.jobPosting.create({
      data: {
        ...fields,
        firstSeenAt: at,
        lastVerifiedAt: at,
        importedAt: at,
        isActive: true,
        sources: {
          create: {
            sourceType: source.sourceType,
            sourceJobId: source.sourceJobId,
            sourceUrl: source.sourceUrl,
            applicationUrl: source.applicationUrl,
            raw: asJson(source.raw),
            importedAt: at,
            lastSeenAt: at,
          },
        },
      },
      select: { id: true },
    });
    return posting.id;
  }

  async archiveExpired(opts: {
    cutoff: Date;
    now: Date;
    countOnly: boolean;
  }): Promise<number> {
    // Saved/applied retention: any linked JobApplication exempts the
    // posting from archival regardless of age (spec requirement).
    const where: Prisma.JobPostingWhereInput = {
      isActive: true,
      applications: { none: {} },
      OR: [
        { sourcePostedAt: { lt: opts.cutoff } },
        { sourcePostedAt: null, firstSeenAt: { lt: opts.cutoff } },
        { expiresAt: { lt: opts.now } },
      ],
    };

    if (opts.countOnly) {
      return prisma.jobPosting.count({ where });
    }
    const { count } = await prisma.jobPosting.updateMany({
      where,
      data: { isActive: false, archivedAt: opts.now },
    });
    return count;
  }
}
