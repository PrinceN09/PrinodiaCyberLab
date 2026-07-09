"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Pin,
  Eye,
  Pencil,
  Save,
  Folder as FolderIcon,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  updatedAt: string | Date;
  folder: { name: string } | null;
  tags: { id: string; name: string }[];
};

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [activeId, setActiveId] = useState<string | null>(
    initialNotes[0]?.id ?? null
  );
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const active = notes.find((n) => n.id === activeId) ?? null;
  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(query.toLowerCase())
  );

  function openNote(n: Note) {
    setActiveId(n.id);
    setMode("preview");
    setDraft(n.content);
  }

  async function createNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Untitled note",
        content: "# Untitled note\n\nStart writing…",
      }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes([note, ...notes]);
      setActiveId(note.id);
      setDraft(note.content);
      setMode("edit");
    }
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    const title = draft.split("\n")[0]?.replace(/^#\s*/, "").slice(0, 120) || active.title;
    const res = await fetch(`/api/notes/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft, title }),
    });
    if (res.ok) {
      const updated = await res.json();
      setNotes(notes.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
      setMode("preview");
    }
    setSaving(false);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Note list */}
      <div className="flex w-80 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
        <div className="border-b border-cds-border p-4">
          <Button variant="primary" className="w-full" onClick={createNote}>
            <Plus className="h-4 w-4" /> New note
          </Button>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter notes…"
              className="h-9 w-full border-b border-cds-border bg-cds-layer pl-9 pr-3 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => openNote(n)}
              className={cn(
                "flex w-full flex-col items-start gap-1 border-b border-cds-border px-4 py-3 text-left transition-colors",
                activeId === n.id
                  ? "bg-cds-layer-accent"
                  : "hover:bg-cds-layer"
              )}
            >
              <div className="flex w-full items-center gap-2">
                {n.pinned && (
                  <Pin className="h-3 w-3 shrink-0 text-cds-blue" fill="currentColor" />
                )}
                <span className="truncate text-sm font-medium text-cds-text">
                  {n.title}
                </span>
              </div>
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-1 text-2xs text-cds-helper">
                  {n.folder && (
                    <>
                      <FolderIcon className="h-3 w-3" />
                      {n.folder.name}
                    </>
                  )}
                </span>
                <span className="text-2xs text-cds-helper">
                  {relativeTime(n.updatedAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor / preview */}
      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <div className="flex items-center justify-between border-b border-cds-border px-6 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-cds-text">
                  {active.title}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {active.tags.map((t) => (
                    <Badge key={t.id} tone="blue">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {mode === "preview" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDraft(active.content);
                      setMode("edit");
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setMode("preview")}
                    >
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                    <Button variant="primary" onClick={save} disabled={saving}>
                      <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {mode === "preview" ? (
                <div className="h-full overflow-y-auto px-8 py-6">
                  <Markdown>{active.content}</Markdown>
                </div>
              ) : (
                <div className="grid h-full grid-cols-2 divide-x divide-cds-border">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                    className="h-full resize-none bg-cds-bg p-6 font-mono text-sm leading-relaxed text-cds-text-secondary focus:outline-none"
                  />
                  <div className="h-full overflow-y-auto px-6 py-4">
                    <Markdown>{draft}</Markdown>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-cds-helper">
            Select or create a note to begin.
          </div>
        )}
      </div>
    </div>
  );
}
