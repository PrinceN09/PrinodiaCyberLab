import type { Tone } from "@/components/ui/badge";

export type Folder = { id: string; name: string };
export type Category = { id: string; name: string };
export type Tag = { id: string; name: string };

export type NoteStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
export type NoteDifficulty =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "EXPERT";

export type Note = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  content: string;
  status: NoteStatus;
  difficulty: NoteDifficulty | null;
  pinned: boolean;
  favorite: boolean;
  folderId: string | null;
  folder: Folder | null;
  categoryId: string | null;
  category: Category | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
};

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

export type NoteLink = {
  id: string;
  targetType: NoteLinkType;
  targetId: string;
  label: string;
  createdAt: string;
};

export type KnowledgeHit = {
  type: NoteLinkType;
  id: string;
  label: string;
  meta: string | null;
};

export type AttachmentMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type NoteVersionMeta = {
  id: string;
  title: string;
  cause: string;
  createdAt: string;
};

export const STATUS_META: Record<
  NoteStatus,
  { label: string; tone: Tone }
> = {
  DRAFT: { label: "Draft", tone: "gray" },
  IN_PROGRESS: { label: "In progress", tone: "blue" },
  COMPLETED: { label: "Completed", tone: "green" },
  ARCHIVED: { label: "Archived", tone: "yellow" },
};

export const DIFFICULTY_META: Record<
  NoteDifficulty,
  { label: string; tone: Tone }
> = {
  BEGINNER: { label: "Beginner", tone: "green" },
  INTERMEDIATE: { label: "Intermediate", tone: "blue" },
  ADVANCED: { label: "Advanced", tone: "orange" },
  EXPERT: { label: "Expert", tone: "red" },
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

export const CATEGORY_SUGGESTIONS = [
  "SOC Operations",
  "Threat Intelligence",
  "Incident Response",
  "Vulnerability Management",
  "GRC",
  "Penetration Testing",
  "Networking",
  "Linux",
  "Cloud Security",
  "General",
];

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
