/**
 * Client-safe knowledge-graph types shared by the Notes and Code
 * workspaces (the server-side counterpart lives in lib/notes/knowledge.ts).
 */

export type NoteLinkType =
  | "COURSE"
  | "LESSON"
  | "PROJECT"
  | "CODE_SNIPPET"
  | "DIAGRAM"
  | "STUDY_SESSION"
  | "INTERVIEW_QUESTION"
  | "PORTFOLIO_ITEM"
  | "REPORT"
  | "NOTE";

export type KnowledgeHit = {
  type: NoteLinkType;
  id: string;
  label: string;
  meta: string | null;
};

export const LINK_TYPE_META: Record<
  NoteLinkType,
  { label: string; plural: string }
> = {
  COURSE: { label: "Course", plural: "Courses" },
  LESSON: { label: "Lesson", plural: "Lessons" },
  PROJECT: { label: "Project", plural: "Projects" },
  CODE_SNIPPET: { label: "Code snippet", plural: "Code snippets" },
  DIAGRAM: { label: "Diagram", plural: "Diagrams" },
  STUDY_SESSION: { label: "Study session", plural: "Study sessions" },
  INTERVIEW_QUESTION: {
    label: "Interview question",
    plural: "Interview questions",
  },
  PORTFOLIO_ITEM: { label: "Resume project", plural: "Resume projects" },
  REPORT: { label: "Report", plural: "Reports" },
  NOTE: { label: "Note", plural: "Notes" },
};

/** Module routes for "open in module" links from related-knowledge lists. */
export const MODULE_ROUTES: Record<NoteLinkType, string> = {
  COURSE: "/learning/courses",
  LESSON: "/learning/courses",
  PROJECT: "/projects",
  CODE_SNIPPET: "/code",
  DIAGRAM: "/diagrams",
  STUDY_SESSION: "/learning/sessions",
  INTERVIEW_QUESTION: "/career/interview",
  PORTFOLIO_ITEM: "/career/portfolio",
  REPORT: "/reports",
  NOTE: "/notes",
};

/** Shared JSON fetch that throws the server's error message. */
export async function apiFetch<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // keep status-based message
    }
    throw new Error(message);
  }
  return res.json();
}
