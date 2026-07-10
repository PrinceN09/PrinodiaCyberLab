"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X, Loader2, ExternalLink, ChevronDown } from "lucide-react";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { KnowledgePicker } from "@/components/knowledge-picker";
import { cn, formatDate } from "@/lib/utils";
import {
  apiFetch,
  CODE_CATEGORY_META,
  DIFFICULTY_LABELS,
  LINK_TYPE_META,
  MODULE_ROUTES,
  type CodeCategory,
  type CodeFolder,
  type Snippet,
  type SnippetDifficulty,
  type SnippetRelation,
  type NoteLinkType,
} from "./types";

export type SnippetPatch = {
  description?: string | null;
  category?: CodeCategory | null;
  difficulty?: SnippetDifficulty | null;
  folderId?: string | null;
  tags?: string[];
};

/**
 * Right panel: snippet metadata (auto-saved) + linked knowledge.
 * `onEdit` queues a debounced save; optimistic state is applied by
 * the orchestrator.
 */
export function SnippetDetails({
  snippet,
  folders,
  onEdit,
  onResolveFolder,
}: {
  snippet: Snippet;
  folders: CodeFolder[];
  onEdit: (patch: SnippetPatch, optimistic: Partial<Snippet>) => void;
  onResolveFolder: (name: string) => Promise<CodeFolder | null>;
}) {
  // Text fields keep local state; the parent state is authoritative
  // per snippet (keyed remount below resets these on switch).
  const [tagsText, setTagsText] = useState(
    snippet.tags.map((t) => t.name).join(", ")
  );
  const [folderText, setFolderText] = useState(snippet.folder?.name ?? "");

  async function commitFolder() {
    const name = folderText.trim();
    if (name === (snippet.folder?.name ?? "")) return;
    if (!name) {
      onEdit({ folderId: null }, { folderId: null, folder: null });
      return;
    }
    const folder = await onResolveFolder(name);
    if (folder) {
      onEdit({ folderId: folder.id }, { folderId: folder.id, folder });
    }
  }

  function commitTags(text: string) {
    setTagsText(text);
    const names = text.split(",").map((t) => t.trim()).filter(Boolean);
    onEdit(
      { tags: names },
      { tags: names.map((name) => ({ id: name, name })) }
    );
  }

  return (
    <aside
      aria-label="Snippet details"
      className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-cds-border bg-cds-bg xl:flex"
    >
      <div className="border-b border-cds-border px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
        Details
      </div>
      <div className="space-y-4 border-b border-cds-border p-4">
        <div>
          <Label htmlFor="sn-description">Description</Label>
          <Textarea
            id="sn-description"
            rows={3}
            value={snippet.description ?? ""}
            placeholder="What this snippet does, when to use it…"
            onChange={(e) =>
              onEdit(
                { description: e.target.value || null },
                { description: e.target.value || null }
              )
            }
          />
        </div>
        <div>
          <Label htmlFor="sn-folder">Folder</Label>
          <div className="relative">
            <Input
              id="sn-folder"
              list="code-folders"
              value={folderText}
              placeholder="Choose or create…"
              onChange={(e) => setFolderText(e.target.value)}
              onBlur={() => void commitFolder()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commitFolder();
                }
              }}
            />
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
          </div>
          <datalist id="code-folders">
            {folders.map((f) => (
              <option key={f.id} value={f.name} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sn-category">Category</Label>
            <Select
              id="sn-category"
              value={snippet.category ?? ""}
              onChange={(e) => {
                const category = (e.target.value || null) as CodeCategory | null;
                onEdit({ category }, { category });
              }}
            >
              <option value="">Not set</option>
              {(Object.keys(CODE_CATEGORY_META) as CodeCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CODE_CATEGORY_META[c].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sn-difficulty">Difficulty</Label>
            <Select
              id="sn-difficulty"
              value={snippet.difficulty ?? ""}
              onChange={(e) => {
                const difficulty = (e.target.value ||
                  null) as SnippetDifficulty | null;
                onEdit({ difficulty }, { difficulty });
              }}
            >
              <option value="">Not set</option>
              {(Object.keys(DIFFICULTY_LABELS) as SnippetDifficulty[]).map(
                (d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABELS[d]}
                  </option>
                )
              )}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="sn-tags">Tags (comma-separated)</Label>
          <Input
            id="sn-tags"
            value={tagsText}
            placeholder="Splunk, Detection, Nmap"
            onChange={(e) => commitTags(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-cds-helper">
          <span>Created {formatDate(snippet.createdAt)}</span>
          <span>Updated {formatDate(snippet.updatedAt)}</span>
        </div>
      </div>

      <SnippetRelations snippetId={snippet.id} />
    </aside>
  );
}

// ── Linked knowledge ────────────────────────────

const SNIPPET_LINK_TYPES: NoteLinkType[] = [
  "NOTE",
  "PROJECT",
  "COURSE",
  "LESSON",
];

function SnippetRelations({ snippetId }: { snippetId: string }) {
  const [relations, setRelations] = useState<SnippetRelation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setRelations(
        await apiFetch<SnippetRelation[]>(`/api/snippets/${snippetId}/relations`)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [snippetId]);

  useEffect(() => {
    setRelations(null);
    void reload();
  }, [reload]);

  const grouped = useMemo(() => {
    const g = new Map<NoteLinkType, SnippetRelation[]>();
    for (const r of relations ?? []) {
      g.set(r.targetType, [...(g.get(r.targetType) ?? []), r]);
    }
    return g;
  }, [relations]);

  async function remove(relation: SnippetRelation) {
    setRelations((prev) => (prev ?? []).filter((r) => r.id !== relation.id));
    try {
      await apiFetch(`/api/snippets/${snippetId}/relations/${relation.id}`, {
        method: "DELETE",
      });
    } catch {
      void reload();
    }
  }

  return (
    <div className="flex flex-col py-2">
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          Linked knowledge
        </span>
        <button
          onClick={() => setPickerOpen(true)}
          aria-label="Link knowledge"
          title="Link a note, project, course, or lesson"
          className="flex h-6 w-6 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {relations === null && !error && (
        <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-cds-helper">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      )}
      {error && (
        <div className="px-4 py-4 text-center text-xs text-cds-helper">
          {error}{" "}
          <button
            onClick={() => void reload()}
            className="font-semibold text-cds-link underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
      {relations?.length === 0 && (
        <div className="px-4 py-6 text-center text-2xs leading-relaxed text-cds-helper">
          Connect this snippet to the note, project, course, or lesson it
          belongs to.
        </div>
      )}

      {[...grouped.entries()].map(([type, typeRelations]) => (
        <div key={type} className="mb-2">
          <div className="px-4 py-1 text-2xs text-cds-helper">
            {LINK_TYPE_META[type].plural}
          </div>
          {typeRelations.map((r) => (
            <div
              key={r.id}
              className="group flex items-center gap-1.5 px-4 py-1 text-xs text-cds-text-secondary hover:bg-cds-layer-accent"
            >
              <a
                href={MODULE_ROUTES[r.targetType]}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-1 truncate",
                  r.targetType === "NOTE"
                    ? "text-cds-link hover:underline"
                    : "hover:text-cds-text"
                )}
                title={`${r.label} — open ${LINK_TYPE_META[r.targetType].label.toLowerCase()} module`}
              >
                <span className="truncate">{r.label}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
              <button
                onClick={() => remove(r)}
                aria-label={`Remove link to ${r.label}`}
                className="opacity-0 transition-opacity hover:text-cds-red group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ))}

      <KnowledgePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allowedTypes={SNIPPET_LINK_TYPES}
        onPick={async (hit) => {
          await apiFetch(`/api/snippets/${snippetId}/relations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetType: hit.type,
              targetId: hit.id,
              label: hit.label,
            }),
          });
          void reload();
        }}
      />
    </div>
  );
}
