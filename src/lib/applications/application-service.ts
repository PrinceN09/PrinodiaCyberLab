/**
 * ApplicationService — user-scoped queries and mutations for the CRM.
 * Every read and write filters by userId; materials (resume / cover
 * letter) are verified to belong to the same user before attaching.
 * Multi-record writes use transactions and always append timeline
 * events for major changes.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conflict, forbidden, notFound, validation } from "./errors";
import {
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  type ApplicationStatus,
} from "./status";
import { recordEvent } from "./timeline";
import type {
  ApplicationListQuery,
  ManualApplicationInput,
} from "./validation";

const ACTIVE = ACTIVE_STATUSES as readonly ApplicationStatus[];
const CLOSED = TERMINAL_STATUSES as readonly ApplicationStatus[];

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function endOfDay(now: Date): Date {
  const s = startOfDay(now);
  return new Date(s.getTime() + 86_400_000 - 1);
}

// ── Ownership guard ──────────────────────────────

export async function requireOwnedApplication(
  userId: string,
  applicationId: string
): Promise<{ id: string; userId: string; status: string }> {
  const app = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, status: true },
  });
  if (!app) throw notFound();
  if (app.userId !== userId) throw forbidden();
  return app;
}

// ── List ─────────────────────────────────────────

export async function listApplications(
  userId: string,
  query: ApplicationListQuery,
  now: Date = new Date()
) {
  const and: Prisma.JobApplicationWhereInput[] = [{ userId }];

  if (query.status) and.push({ status: query.status });
  else if (query.lifecycle === "active") and.push({ status: { in: [...ACTIVE] } });
  else if (query.lifecycle === "closed") and.push({ status: { in: [...CLOSED] } });

  if (query.company) {
    and.push({ company: { contains: query.company, mode: "insensitive" } });
  }
  if (query.location) {
    and.push({ location: { contains: query.location, mode: "insensitive" } });
  }
  if (query.workplaceType) {
    and.push({ workplaceType: query.workplaceType as never });
  }
  if (query.matchMin !== null) {
    and.push({ matchScore: { gte: query.matchMin } });
  }
  if (query.hasCoverLetter === true) and.push({ coverLetterId: { not: null } });
  if (query.hasCoverLetter === false) and.push({ coverLetterId: null });
  if (query.hasRecruiter === true) {
    and.push({ OR: [{ recruiterName: { not: null } }, { recruiter: { not: null } }] });
  }
  if (query.q) {
    and.push({
      OR: [
        { jobTitle: { contains: query.q, mode: "insensitive" } },
        { company: { contains: query.q, mode: "insensitive" } },
        { location: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  if (query.followUp === "none") and.push({ followUpDate: null });
  if (query.followUp === "overdue") {
    and.push({ followUpDate: { lt: startOfDay(now) }, followUpCompleted: false });
  }
  if (query.followUp === "today") {
    and.push({
      followUpDate: { gte: startOfDay(now), lte: endOfDay(now) },
      followUpCompleted: false,
    });
  }
  if (query.followUp === "upcoming") {
    and.push({ followUpDate: { gt: endOfDay(now) }, followUpCompleted: false });
  }

  const where: Prisma.JobApplicationWhereInput = { AND: and };
  const orderBy = orderByFor(query.sort);

  const [total, items] = await Promise.all([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        interviews: {
          select: { id: true, status: true, scheduledAt: true, startTime: true, type: true },
        },
        assessments: { select: { id: true, status: true, dueDate: true } },
        offer: { select: { decision: true, expiryDate: true } },
        _count: { select: { interviews: true, assessments: true, appNotes: true } },
      },
    }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

function orderByFor(
  sort: ApplicationListQuery["sort"]
): Prisma.JobApplicationOrderByWithRelationInput[] {
  switch (sort) {
    case "applied":
      return [{ appliedDate: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }];
    case "followUp":
      return [{ followUpDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }];
    case "match":
      return [{ matchScore: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }];
    case "company":
      return [{ company: "asc" }, { jobTitle: "asc" }];
    case "status":
      return [{ status: "asc" }, { updatedAt: "desc" }];
    case "interview":
      return [{ interviewDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }];
    case "updated":
    default:
      return [{ updatedAt: "desc" }];
  }
}

// ── Get (full detail) ────────────────────────────

export async function getApplication(userId: string, applicationId: string) {
  const app = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      interviews: { orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }] },
      assessments: { orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] },
      offer: true,
      appNotes: { orderBy: { updatedAt: "desc" } },
      events: { orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }] },
      resume: { select: { id: true, title: true, targetRole: true } },
      coverLetter: { select: { id: true, title: true, company: true } },
      jobPosting: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          workplaceType: true,
          employmentType: true,
          matchScore: true,
          applicationUrl: true,
          primarySourceUrl: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          salaryPeriod: true,
        },
      },
    },
  });
  if (!app) throw notFound();
  if (app.userId !== userId) throw forbidden();
  return app;
}

// ── Create (manual) ──────────────────────────────

export async function createManualApplication(
  userId: string,
  input: ManualApplicationInput
) {
  const now = new Date();
  return prisma.jobApplication.create({
    data: {
      userId,
      source: "MANUAL",
      status: "SAVED",
      company: input.company,
      jobTitle: input.jobTitle,
      location: input.location,
      url: input.url,
      applicationUrl: input.applicationUrl,
      workplaceType: (input.workplaceType as never) ?? null,
      employmentType: (input.employmentType as never) ?? null,
      salary: input.salary,
      notes: input.notes,
      savedAt: now,
      lastActivityAt: now,
      events: {
        create: {
          kind: "job_saved",
          userId,
          summary: "Manually added to the tracker",
          metadata: { source: "MANUAL" },
        },
      },
    },
  });
}

// ── Save from a discovered posting (idempotent) ──

export async function saveFromPosting(userId: string, postingId: string) {
  const posting = await prisma.jobPosting.findUnique({
    where: { id: postingId },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      workplaceType: true,
      employmentType: true,
      matchScore: true,
      applicationUrl: true,
      primarySourceUrl: true,
    },
  });
  if (!posting) throw notFound("Job not found");

  const existing = await prisma.jobApplication.findFirst({
    where: { userId, jobPostingId: postingId },
    select: { id: true, status: true },
  });
  if (existing) return existing; // idempotent, prevents duplicates

  const now = new Date();
  try {
    return await prisma.jobApplication.create({
      data: {
        userId,
        jobPostingId: postingId,
        source: "DISCOVERY",
        status: "SAVED",
        company: posting.company,
        jobTitle: posting.title,
        location: posting.location,
        workplaceType: posting.workplaceType,
        employmentType: posting.employmentType,
        matchScore: posting.matchScore,
        url: posting.applicationUrl ?? posting.primarySourceUrl,
        applicationUrl: posting.applicationUrl,
        discoveredAt: now,
        savedAt: now,
        lastActivityAt: now,
        events: {
          create: {
            kind: "job_saved",
            userId,
            summary: "Saved from job discovery",
            metadata: { postingId },
          },
        },
      },
      select: { id: true, status: true },
    });
  } catch (e) {
    // Unique (userId, jobPostingId) race → treat as idempotent.
    if (
      typeof e === "object" &&
      e !== null &&
      (e as { code?: string }).code === "P2002"
    ) {
      const race = await prisma.jobApplication.findFirst({
        where: { userId, jobPostingId: postingId },
        select: { id: true, status: true },
      });
      if (race) return race;
    }
    throw e;
  }
}

// ── Update (materials, contacts, follow-up, fields) ──

export async function updateApplication(
  userId: string,
  applicationId: string,
  patch: Record<string, unknown>
) {
  const before = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      userId: true,
      recruiterName: true,
      recruiterEmail: true,
      followUpDate: true,
      followUpCompleted: true,
    },
  });
  if (!before) throw notFound();
  if (before.userId !== userId) throw forbidden();

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.jobApplication.update({
      where: { id: applicationId },
      data: { ...patch, lastActivityAt: now },
    });

    // Derived timeline events for meaningful field changes.
    const addingRecruiter =
      (patch.recruiterName || patch.recruiterEmail) &&
      !before.recruiterName &&
      !before.recruiterEmail;
    if (addingRecruiter) {
      await recordEvent(tx, applicationId, {
        kind: "recruiter_added",
        userId,
        summary: String(patch.recruiterName ?? patch.recruiterEmail),
      });
    }
    if ("followUpDate" in patch && patch.followUpDate) {
      await recordEvent(tx, applicationId, {
        kind: "follow_up_scheduled",
        userId,
        summary: `Follow-up set for ${(patch.followUpDate as Date).toISOString().slice(0, 10)}`,
        metadata: { reason: patch.followUpReason ?? null },
      });
    }
    if (patch.followUpCompleted === true && !before.followUpCompleted) {
      await recordEvent(tx, applicationId, {
        kind: "follow_up_completed",
        userId,
      });
    }
    return updated;
  });
}

// ── Materials (cross-user attach prevention) ─────

export async function selectResume(
  userId: string,
  applicationId: string,
  resumeId: string | null
) {
  await requireOwnedApplication(userId, applicationId);
  let version: string | null = null;
  if (resumeId) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true, userId: true, title: true },
    });
    if (!resume) throw notFound("Resume not found");
    if (resume.userId !== userId) {
      throw forbidden("You can only attach your own resume");
    }
    version = resume.title;
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.jobApplication.update({
      where: { id: applicationId },
      data: { resumeId, resumeVersion: version, lastActivityAt: new Date() },
    });
    if (resumeId) {
      await recordEvent(tx, applicationId, {
        kind: "resume_selected",
        userId,
        summary: version ?? "Resume attached",
        metadata: { resumeId },
      });
    }
    return updated;
  });
}

export async function selectCoverLetter(
  userId: string,
  applicationId: string,
  coverLetterId: string | null
) {
  await requireOwnedApplication(userId, applicationId);
  let version: string | null = null;
  if (coverLetterId) {
    const cl = await prisma.coverLetter.findUnique({
      where: { id: coverLetterId },
      select: { id: true, userId: true, title: true },
    });
    if (!cl) throw notFound("Cover letter not found");
    if (cl.userId !== userId) {
      throw forbidden("You can only attach your own cover letter");
    }
    version = cl.title;
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.jobApplication.update({
      where: { id: applicationId },
      data: {
        coverLetterId,
        coverLetterVersion: version,
        lastActivityAt: new Date(),
      },
    });
    if (coverLetterId) {
      await recordEvent(tx, applicationId, {
        kind: "cover_letter_selected",
        userId,
        summary: version ?? "Cover letter attached",
        metadata: { coverLetterId },
      });
    }
    return updated;
  });
}

// ── Delete ───────────────────────────────────────

export async function deleteApplication(userId: string, applicationId: string) {
  await requireOwnedApplication(userId, applicationId);
  await prisma.jobApplication.delete({ where: { id: applicationId } });
  return { ok: true };
}

/** Guard used by the manual-create route against obvious duplicates. */
export async function assertNoDuplicateManual(
  userId: string,
  company: string,
  jobTitle: string
) {
  const dupe = await prisma.jobApplication.findFirst({
    where: {
      userId,
      company: { equals: company, mode: "insensitive" },
      jobTitle: { equals: jobTitle, mode: "insensitive" },
      jobPostingId: null,
    },
    select: { id: true },
  });
  if (dupe) {
    throw conflict("You already have an application for this role and company");
  }
}
