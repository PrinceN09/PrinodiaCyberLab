"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Code2,
  Folder as FolderIcon,
  FolderOpen,
  Files,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";
import {
  LANGUAGES,
  languageMeta,
  type CodeFolder,
  type Snippet,
} from "./types";

const UNFILED = "__unfiled__";

/** Searches title, description, code, tags, folder, and category. */
function matches(s: Snippet, q: string): boolean {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    s.title.toLowerCase().includes(query) ||
    (s.description ?? "").toLowerCase().includes(query) ||
    s.code.toLowerCase().includes(query) ||
    (s.folder?.name ?? "").toLowerCase().includes(query) ||
    (s.category ?? "").toLowerCase().replace(/_/g, " ").includes(query) ||
    s.tags.some((t) => t.name.toLowerCase().includes(query))
  );
}

export function SnippetSidebar({
  snippets,
  folders,
  activeId,
  onSelect,
  onNew,
}: {
  snippets: Snippet[];
  folders: CodeFolder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<string>("ALL");
  const [folderId, setFolderId] = useState<string>("ALL");

  // Filter chips include legacy languages that exist in the data.
  const languagesInUse = useMemo(() => {
    const extra = new Set(snippets.map((s) => s.language));
    for (const l of LANGUAGES) extra.delete(l);
    return [...LANGUAGES, ...extra];
  }, [snippets]);

  const filtered = useMemo(
    () =>
      snippets.filter((s) => {
        if (!matches(s, query)) return false;
        if (language !== "ALL" && s.language !== language) return false;
        if (folderId === UNFILED && s.folderId) return false;
        if (folderId !== "ALL" && folderId !== UNFILED && s.folderId !== folderId)
          return false;
        return true;
      }),
    [snippets, query, language, folderId]
  );

  const countFor = (id: string) =>
    id === "ALL"
      ? snippets.length
      : id === UNFILED
        ? snippets.filter((s) => !s.folderId).length
        : snippets.filter((s) => s.folderId === id).length;

  const unfiledCount = countFor(UNFILED);

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
      <div className="flex items-center justify-between border-b border-cds-border px-4 py-2.5">
        <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          Code Workspace
        </span>
        <span className="text-2xs tabular-nums text-cds-helper">
          {filtered.length}/{snippets.length}
        </span>
      </div>

      <div className="space-y-2 border-b border-cds-border p-4">
        <Button variant="primary" className="w-full" onClick={onNew}>
          <Plus className="h-4 w-4" /> New snippet
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search snippets…"
            aria-label="Search snippets"
            className="h-9 w-full border-b border-cds-border bg-cds-field pl-9 pr-3 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
          />
        </div>
      </div>

      {/* Language filter */}
      <div className="border-b border-cds-border px-4 py-3">
        <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          Languages
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by language">
          <FilterChip
            label="All"
            active={language === "ALL"}
            onClick={() => setLanguage("ALL")}
          />
          {languagesInUse.map((l) => (
            <FilterChip
              key={l}
              label={languageMeta(l).label}
              active={language === l}
              onClick={() => setLanguage(language === l ? "ALL" : l)}
            />
          ))}
        </div>
      </div>

      {/* Folders */}
      <div className="border-b border-cds-border px-2 py-3">
        <div className="mb-1 px-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          Folders
        </div>
        <FolderRow
          icon={Files}
          label="All snippets"
          count={countFor("ALL")}
          active={folderId === "ALL"}
          onClick={() => setFolderId("ALL")}
        />
        {folders.map((f) => (
          <FolderRow
            key={f.id}
            icon={folderId === f.id ? FolderOpen : FolderIcon}
            label={f.name}
            count={countFor(f.id)}
            active={folderId === f.id}
            onClick={() => setFolderId(folderId === f.id ? "ALL" : f.id)}
          />
        ))}
        {unfiledCount > 0 && (
          <FolderRow
            icon={FolderIcon}
            label="Unfiled"
            count={unfiledCount}
            active={folderId === UNFILED}
            onClick={() => setFolderId(folderId === UNFILED ? "ALL" : UNFILED)}
          />
        )}
      </div>

      {/* Snippet list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-cds-helper">
            {query
              ? `No snippets match “${query}”.`
              : "No snippets here yet."}
          </div>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "flex w-full flex-col items-start gap-1.5 border-b border-cds-border px-4 py-3 text-left transition-colors",
                activeId === s.id ? "bg-cds-layer-accent" : "hover:bg-cds-layer"
              )}
            >
              <div className="flex w-full items-center gap-2">
                <Code2 className="h-3.5 w-3.5 shrink-0 text-cds-helper" />
                <span className="truncate text-sm font-medium text-cds-text">
                  {s.title || "Untitled"}
                </span>
              </div>
              {s.description && (
                <span className="line-clamp-1 text-2xs text-cds-helper">
                  {s.description}
                </span>
              )}
              <div className="flex w-full items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Badge tone={languageMeta(s.language).tone}>
                    {languageMeta(s.language).label}
                  </Badge>
                  {s.folder && (
                    <span className="flex min-w-0 items-center gap-1 truncate text-2xs text-cds-helper">
                      <FolderIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.folder.name}</span>
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-2xs text-cds-helper">
                  {relativeTime(s.updatedAt)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-2 py-1 text-2xs transition-colors",
        active
          ? "bg-cds-blue/15 font-semibold text-cds-link"
          : "text-cds-helper hover:bg-cds-layer-accent hover:text-cds-text"
      )}
    >
      {label}
    </button>
  );
}

function FolderRow({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: typeof FolderIcon;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2 px-2 py-1.5 text-xs transition-colors",
        active
          ? "bg-cds-layer-accent font-medium text-cds-text"
          : "text-cds-text-secondary hover:bg-cds-layer hover:text-cds-text"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-cds-helper" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span className="shrink-0 text-2xs tabular-nums text-cds-helper">
        {count}
      </span>
    </button>
  );
}
