import { prisma } from "@/lib/prisma";
import type { NoteLinkType } from "@prisma/client";

export const NOTE_LINK_TYPES = [
  "COURSE",
  "LESSON",
  "PROJECT",
  "CODE_SNIPPET",
  "DIAGRAM",
  "STUDY_SESSION",
  "INTERVIEW_QUESTION",
  "PORTFOLIO_ITEM",
  "REPORT",
  "NOTE",
] as const;

export const NOTE_LINK_TYPE_LABELS: Record<NoteLinkType, string> = {
  COURSE: "Course",
  LESSON: "Lesson",
  PROJECT: "Project",
  CODE_SNIPPET: "Code snippet",
  DIAGRAM: "Diagram",
  STUDY_SESSION: "Study session",
  INTERVIEW_QUESTION: "Interview question",
  PORTFOLIO_ITEM: "Resume project",
  REPORT: "Report",
  NOTE: "Note",
};

export type KnowledgeHit = {
  type: NoteLinkType;
  id: string;
  label: string;
  meta: string | null;
};

const PER_TYPE_LIMIT = 8;

/**
 * Searches every linkable entity type for `q`, scoped to the user.
 * Powers the "Related Knowledge" add-link picker.
 */
export async function searchKnowledge({
  userId,
  q,
  types,
  excludeNoteId,
}: {
  userId: string;
  q: string;
  types: NoteLinkType[];
  excludeNoteId?: string;
}): Promise<KnowledgeHit[]> {
  const query = q.trim();
  const contains = { contains: query, mode: "insensitive" as const };
  const wants = (t: NoteLinkType) => types.includes(t);

  const [
    courses,
    lessons,
    projects,
    snippets,
    diagrams,
    sessions,
    questions,
    portfolio,
    reports,
    notes,
  ] = await Promise.all([
    wants("COURSE")
      ? prisma.course.findMany({
          where: { userId, title: contains },
          select: { id: true, title: true, provider: true },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("LESSON")
      ? prisma.lesson.findMany({
          where: {
            title: contains,
            module: { course: { userId } },
          },
          select: {
            id: true,
            title: true,
            module: { select: { course: { select: { title: true } } } },
          },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("PROJECT")
      ? prisma.project.findMany({
          where: { userId, name: contains },
          select: { id: true, name: true, status: true },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("CODE_SNIPPET")
      ? prisma.codeSnippet.findMany({
          where: { userId, title: contains },
          select: { id: true, title: true, language: true },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("DIAGRAM")
      ? prisma.diagram.findMany({
          where: { userId, title: contains },
          select: { id: true, title: true, type: true },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("STUDY_SESSION")
      ? prisma.studySession.findMany({
          where: { userId, topic: contains },
          select: { id: true, topic: true, date: true },
          orderBy: { date: "desc" },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("INTERVIEW_QUESTION")
      ? prisma.interviewPrep.findMany({
          where: { userId, question: contains },
          select: { id: true, question: true, category: true },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("PORTFOLIO_ITEM")
      ? prisma.portfolioItem.findMany({
          where: { userId, title: contains },
          select: { id: true, title: true, category: true },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("REPORT")
      ? prisma.report.findMany({
          where: { userId, title: contains },
          select: { id: true, title: true, type: true },
          take: PER_TYPE_LIMIT,
        })
      : [],
    wants("NOTE")
      ? prisma.note.findMany({
          where: {
            userId,
            title: contains,
            ...(excludeNoteId && { id: { not: excludeNoteId } }),
          },
          select: { id: true, title: true, category: { select: { name: true } } },
          take: PER_TYPE_LIMIT,
        })
      : [],
  ]);

  const truncate = (s: string, n = 80) =>
    s.length > n ? `${s.slice(0, n - 1)}…` : s;

  return [
    ...courses.map((c) => ({
      type: "COURSE" as const,
      id: c.id,
      label: c.title,
      meta: c.provider,
    })),
    ...lessons.map((l) => ({
      type: "LESSON" as const,
      id: l.id,
      label: l.title,
      meta: l.module.course.title,
    })),
    ...projects.map((p) => ({
      type: "PROJECT" as const,
      id: p.id,
      label: p.name,
      meta: p.status,
    })),
    ...snippets.map((s) => ({
      type: "CODE_SNIPPET" as const,
      id: s.id,
      label: s.title,
      meta: s.language,
    })),
    ...diagrams.map((d) => ({
      type: "DIAGRAM" as const,
      id: d.id,
      label: d.title,
      meta: d.type,
    })),
    ...sessions.map((s) => ({
      type: "STUDY_SESSION" as const,
      id: s.id,
      label: s.topic,
      meta: s.date.toISOString().slice(0, 10),
    })),
    ...questions.map((iq) => ({
      type: "INTERVIEW_QUESTION" as const,
      id: iq.id,
      label: truncate(iq.question),
      meta: iq.category,
    })),
    ...portfolio.map((p) => ({
      type: "PORTFOLIO_ITEM" as const,
      id: p.id,
      label: p.title,
      meta: p.category,
    })),
    ...reports.map((r) => ({
      type: "REPORT" as const,
      id: r.id,
      label: r.title,
      meta: r.type,
    })),
    ...notes.map((n) => ({
      type: "NOTE" as const,
      id: n.id,
      label: n.title,
      meta: n.category?.name ?? null,
    })),
  ];
}
