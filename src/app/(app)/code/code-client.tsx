"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Copy, Check, Trash2, Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SaveStatus } from "@/components/save-status";
import { useTheme } from "@/components/theme/theme-provider";
import { useAutoSave } from "@/hooks/use-autosave";
import {
  apiFetch,
  CODE_CATEGORY_META,
  DIFFICULTY_LABELS,
  LANGUAGES,
  languageMeta,
  NEW_SNIPPET_TEMPLATES,
  type CodeFolder,
  type Snippet,
} from "./_components/types";
import { SnippetSidebar } from "./_components/snippet-sidebar";
import {
  SnippetDetails,
  type SnippetPatch,
} from "./_components/snippet-details";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-cds-helper">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading editor…
    </div>
  ),
});

export function CodeClient({
  initialSnippets,
  initialFolders,
}: {
  initialSnippets: Snippet[];
  initialFolders: CodeFolder[];
}) {
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [folders, setFolders] = useState<CodeFolder[]>(initialFolders);
  const [activeId, setActiveId] = useState<string | null>(
    initialSnippets[0]?.id ?? null
  );
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

  const active = snippets.find((s) => s.id === activeId) ?? null;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // ── Auto-save (2s debounce, flush on switch/unload, retry) ──
  const saveRequest = useCallback(
    async (
      id: string,
      patch: Record<string, unknown>,
      { keepalive }: { keepalive: boolean }
    ): Promise<Snippet> => {
      return apiFetch<Snippet>(`/api/snippets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        keepalive,
      });
    },
    []
  );

  const autosave = useAutoSave<Snippet>({
    delay: 2000,
    save: saveRequest,
    onSaved: (id, saved) => {
      // Only sync server-managed fields — never clobber code the
      // user may have typed while the request was in flight.
      setSnippets((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, updatedAt: saved.updatedAt } : s
        )
      );
    },
  });

  /**
   * Optimistic edit + debounced save (used by editor and details panel).
   * When patch fields don't match the client Snippet shape (e.g. tags
   * as string[]), callers pass an explicit `optimistic` state.
   */
  function edit(patch: Record<string, unknown>, optimistic?: Partial<Snippet>) {
    if (!active) return;
    const local = optimistic ?? (patch as Partial<Snippet>);
    setSnippets((prev) =>
      prev.map((s) => (s.id === active.id ? { ...s, ...local } : s))
    );
    autosave.queue(active.id, patch);
  }

  const selectSnippet = useCallback(
    (id: string) => {
      const current = activeIdRef.current;
      if (current && current !== id) autosave.flush(current);
      setActiveId(id);
    },
    [autosave]
  );

  async function createSnippet() {
    const language = "python";
    const snippet = await apiFetch<Snippet>("/api/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New snippet",
        language,
        code: NEW_SNIPPET_TEMPLATES[language],
      }),
    });
    setSnippets((prev) => [snippet, ...prev]);
    setActiveId(snippet.id);
  }

  async function removeSnippet(id: string) {
    if (!window.confirm("Delete this snippet? Its versions are removed too.")) {
      return;
    }
    autosave.discard(id);
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) {
      setActiveId(snippets.find((s) => s.id !== id)?.id ?? null);
    }
    await fetch(`/api/snippets/${id}`, { method: "DELETE" });
  }

  async function resolveFolder(name: string): Promise<CodeFolder | null> {
    const existing = folders.find(
      (f) => f.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;
    try {
      const folder = await apiFetch<CodeFolder>("/api/code-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setFolders((prev) =>
        [...prev, folder].sort((a, b) => a.name.localeCompare(b.name))
      );
      return folder;
    } catch {
      return null;
    }
  }

  function copyCode() {
    if (!active) return;
    navigator.clipboard.writeText(active.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* LEFT — folders, filters, search, list */}
      <SnippetSidebar
        snippets={snippets}
        folders={folders}
        activeId={activeId}
        onSelect={selectSnippet}
        onNew={() => void createSnippet()}
      />

      {/* CENTER — Monaco editor */}
      {active ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-cds-border px-6 py-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <input
                value={active.title}
                onChange={(e) => edit({ title: e.target.value })}
                placeholder="Untitled snippet"
                aria-label="Snippet title"
                className="w-full bg-transparent text-sm font-semibold text-cds-text placeholder:text-cds-helper focus:outline-none"
              />
              <div className="flex items-center gap-2 text-2xs text-cds-helper">
                <SaveStatus
                  entry={autosave.statusFor(active.id)}
                  onRetry={() => autosave.retry(active.id)}
                />
                {active.category && (
                  <Badge tone={CODE_CATEGORY_META[active.category].tone}>
                    {CODE_CATEGORY_META[active.category].label}
                  </Badge>
                )}
                {active.difficulty && (
                  <span>{DIFFICULTY_LABELS[active.difficulty]}</span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label htmlFor="sn-language" className="sr-only">
                Language
              </label>
              <select
                id="sn-language"
                value={active.language}
                onChange={(e) => edit({ language: e.target.value })}
                className="h-9 border border-cds-border bg-cds-field px-2 text-xs text-cds-text focus:border-cds-blue focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {languageMeta(l).label}
                  </option>
                ))}
                {!LANGUAGES.includes(
                  active.language as (typeof LANGUAGES)[number]
                ) && (
                  <option value={active.language}>
                    {languageMeta(active.language).label}
                  </option>
                )}
              </select>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? (
                  <Check className="h-4 w-4 text-cds-green" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => void removeSnippet(active.id)}
                aria-label="Delete snippet"
                title="Delete snippet"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <MonacoEditor
              key={active.id} // fresh model per snippet (undo stack, cursor)
              height="100%"
              language={languageMeta(active.language).monaco}
              theme={theme === "dark" ? "vs-dark" : "light"}
              value={active.code}
              onChange={(v) => edit({ code: v ?? "" })}
              options={{
                fontSize: 13,
                fontFamily: "var(--font-plex-mono), monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                smoothScrolling: true,
                renderLineHighlight: "line",
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Code2}
            title="No snippet selected"
            description="Create a snippet to start building your cybersecurity code library."
            action={
              <Button variant="primary" onClick={() => void createSnippet()}>
                New snippet
              </Button>
            }
          />
        </div>
      )}

      {/* RIGHT — details + linked knowledge */}
      {active && (
        <SnippetDetails
          key={active.id} // reset local field state per snippet
          snippet={active}
          folders={folders}
          onEdit={edit}
          onResolveFolder={resolveFolder}
        />
      )}
    </div>
  );
}
