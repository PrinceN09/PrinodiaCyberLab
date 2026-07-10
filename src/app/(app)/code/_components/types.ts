import type { Tone } from "@/components/ui/badge";
import type { NoteLinkType } from "@/lib/knowledge-types";

export {
  apiFetch,
  LINK_TYPE_META,
  MODULE_ROUTES,
  type KnowledgeHit,
  type NoteLinkType,
} from "@/lib/knowledge-types";

export type CodeFolder = { id: string; name: string };
export type Tag = { id: string; name: string };

export type CodeCategory =
  | "SOC"
  | "SIEM"
  | "THREAT_HUNTING"
  | "INCIDENT_RESPONSE"
  | "VULNERABILITY_MANAGEMENT"
  | "GRC"
  | "PENETRATION_TESTING"
  | "LINUX"
  | "NETWORKING"
  | "CLOUD_SECURITY"
  | "DETECTION_ENGINEERING";

export type SnippetDifficulty =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "EXPERT";

export type Snippet = {
  id: string;
  title: string;
  description: string | null;
  language: string;
  code: string;
  category: CodeCategory | null;
  difficulty: SnippetDifficulty | null;
  folderId: string | null;
  folder: CodeFolder | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
};

export type SnippetRelation = {
  id: string;
  targetType: NoteLinkType;
  targetId: string;
  label: string;
  createdAt: string;
};

/** The 9 supported languages (legacy values like "go" still render). */
export const LANGUAGES = [
  "python",
  "bash",
  "powershell",
  "sql",
  "javascript",
  "typescript",
  "yaml",
  "json",
  "markdown",
] as const;

export const LANGUAGE_META: Record<
  string,
  { label: string; tone: Tone; monaco: string }
> = {
  python: { label: "Python", tone: "blue", monaco: "python" },
  bash: { label: "Bash", tone: "green", monaco: "shell" },
  powershell: { label: "PowerShell", tone: "teal", monaco: "powershell" },
  sql: { label: "SQL", tone: "cyan", monaco: "sql" },
  javascript: { label: "JavaScript", tone: "yellow", monaco: "javascript" },
  typescript: { label: "TypeScript", tone: "blue", monaco: "typescript" },
  yaml: { label: "YAML", tone: "purple", monaco: "yaml" },
  json: { label: "JSON", tone: "orange", monaco: "json" },
  markdown: { label: "Markdown", tone: "gray", monaco: "markdown" },
  // Legacy values from earlier versions of the module:
  shell: { label: "Shell", tone: "green", monaco: "shell" },
  go: { label: "Go", tone: "cyan", monaco: "go" },
};

export function languageMeta(language: string) {
  return (
    LANGUAGE_META[language] ?? {
      label: language,
      tone: "gray" as Tone,
      monaco: language,
    }
  );
}

export const CODE_CATEGORY_META: Record<
  CodeCategory,
  { label: string; tone: Tone }
> = {
  SOC: { label: "SOC", tone: "blue" },
  SIEM: { label: "SIEM", tone: "cyan" },
  THREAT_HUNTING: { label: "Threat Hunting", tone: "purple" },
  INCIDENT_RESPONSE: { label: "Incident Response", tone: "red" },
  VULNERABILITY_MANAGEMENT: { label: "Vulnerability Mgmt", tone: "orange" },
  GRC: { label: "GRC", tone: "magenta" },
  PENETRATION_TESTING: { label: "Penetration Testing", tone: "yellow" },
  LINUX: { label: "Linux", tone: "teal" },
  NETWORKING: { label: "Networking", tone: "green" },
  CLOUD_SECURITY: { label: "Cloud Security", tone: "cyan" },
  DETECTION_ENGINEERING: { label: "Detection Engineering", tone: "blue" },
};

export const DIFFICULTY_LABELS: Record<SnippetDifficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

/** Default file content per language for new snippets. */
export const NEW_SNIPPET_TEMPLATES: Record<string, string> = {
  python: "# New snippet\n",
  bash: "#!/usr/bin/env bash\n# New snippet\n",
  powershell: "# New snippet\n",
  sql: "-- New snippet\n",
  javascript: "// New snippet\n",
  typescript: "// New snippet\n",
  yaml: "# New snippet\n",
  json: "{\n}\n",
  markdown: "# New snippet\n",
};
