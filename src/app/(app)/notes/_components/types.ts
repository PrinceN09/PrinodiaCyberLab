import type { Tone } from "@/components/ui/badge";

// Shared knowledge-graph types now live in lib/knowledge-types and are
// re-exported here so notes components keep a single import location.
export {
  apiFetch,
  LINK_TYPE_META,
  type KnowledgeHit,
  type NoteLinkType,
} from "@/lib/knowledge-types";
import type { NoteLinkType as LinkType } from "@/lib/knowledge-types";

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

export type NoteLink = {
  id: string;
  targetType: LinkType;
  targetId: string;
  label: string;
  createdAt: string;
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
