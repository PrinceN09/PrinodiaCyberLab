"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Pin,
  PinOff,
  Folder as FolderIcon,
  History,
  Check,
  Loader2,
  Tag as TagIcon,
  NotebookText,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, relativeTime } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  updatedAt: string;
  folder: { name: string } | null;
  tags: { id: string; name: string }[];
};

type SaveState = "idle" | "saving" | "saved";

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [activeId, setActiveId] = useState<string | null>(
    initialNotes[0]?.id ?? null
  );
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.content.toLowerCase().includes(query.toLowerCase())
  );
  const pinned = filtered.filter((n) => n.pinned);
  const others = filtered.filter((n) => !n.pinned);
  const recent = [...notes]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 3);

  const persist = useCallback(
    async (id: string, patch: { title?: string; content?: string }) => {
      setSaveState("saving");
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, updatedAt: updated.updatedAt ?? n.updatedAt }
              : n
          )
        );
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      }
    },
    []
  );

  // Debounced autosave when the active note's title/content change.
  const scheduleSave = useCallback(
    (id: string, patch: { title?: string; content?: string }) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => persist(id, patch), 800);
    },
    [persist]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function edit(patch: { title?: string; content?: string }) {
    if (!active) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === active.id ? { ...n, ...patch } : n))
    );
    scheduleSave(active.id, patch);
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
      setNotes([{ ...note, tags: note.tags ?? [], folder: note.folder ?? null }, ...notes]);
      setActiveId(note.id);
    }
  }

  async function togglePin(note: Note) {
    const pinned = !note.pinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned } : n))
    );
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
  }

  function NoteRow({ n }: { n: Note }) {
    return (
      <button
        onClick={() => setActiveId(n.id)}
        className={cn(
          "group flex w-full flex-col items-start gap-1 border-b border-cds-border px-4 py-3 text-left transition-colors",
          activeId === n.id ? "bg-cds-layer-accent" : "hover:bg-cds-layer"
        )}
      >
        <div className="flex w-full items-center gap-2">
          {n.pinned && (
            <Pin className="h-3 w-3 shrink-0 text-cds-blue" fill="currentColor" />
          )}
          <span className="truncate text-sm font-medium text-cds-text">
            {n.title || "Untitled"}
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
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* LEFT — Notes list */}
      <div className="flex w-80 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
        <div className="flex items-center justify-between border-b border-cds-border px-4 py-2.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
            Notes
          </span>
          <span className="text-2xs text-cds-helper">{notes.length}</span>
        </div>
        <div className="border-b border-cds-border p-4">
          <Button variant="primary" className="w-full" onClick={createNote}>
            <Plus className="h-4 w-4" /> New note
          </Button>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              className="h-9 w-full border-b border-cds-border bg-cds-field pl-9 pr-3 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-cds-helper">
              No notes match “{query}”.
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <div className="bg-cds-bg px-4 pt-3 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                    Pinned
                  </div>
                  {pinned.map((n) => (
                    <NoteRow key={n.id} n={n} />
                  ))}
                </>
              )}
              {!query && recent.length > 0 && (
                <div className="bg-cds-bg px-4 pt-3 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                  All notes
                </div>
              )}
              {others.map((n) => (
                <NoteRow key={n.id} n={n} />
              ))}
            </>
          )}
        </div>
      </div>

      {active ? (
        <div className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-cds-border">
          {/* CENTER — Editor */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-cds-border px-5 py-2.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                Editor
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-2xs text-cds-helper">
                  {saveState === "saving" && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                    </>
                  )}
                  {saveState === "saved" && (
                    <>
                      <Check className="h-3 w-3 text-cds-green" /> Saved
                    </>
                  )}
                  {saveState === "idle" && <>Autosave on</>}
                </span>
                <button
                  onClick={() => togglePin(active)}
                  className="flex items-center gap-1.5 text-2xs text-cds-text-secondary hover:text-cds-text"
                >
                  {active.pinned ? (
                    <>
                      <PinOff className="h-3.5 w-3.5" /> Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="h-3.5 w-3.5" /> Pin
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Editable title */}
            <div className="border-b border-cds-border px-5 py-3">
              <input
                value={active.title}
                onChange={(e) => edit({ title: e.target.value })}
                placeholder="Note title"
                className="w-full bg-transparent text-lg font-semibold text-cds-text placeholder:text-cds-helper focus:outline-none"
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {active.folder && (
                  <span className="flex items-center gap-1 text-2xs text-cds-helper">
                    <FolderIcon className="h-3 w-3" /> {active.folder.name}
                  </span>
                )}
                {active.tags.map((t) => (
                  <Badge key={t.id} tone="blue">
                    <TagIcon className="h-2.5 w-2.5" />
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>

            <textarea
              value={active.content}
              onChange={(e) => edit({ content: e.target.value })}
              spellCheck={false}
              placeholder="Write in Markdown…"
              className="min-h-0 flex-1 resize-none bg-cds-bg p-5 font-mono text-sm leading-relaxed text-cds-text-secondary focus:outline-none"
            />
          </div>

          {/* RIGHT — Live preview */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-cds-border px-5 py-2.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                Live Preview
              </span>
              <button
                className="flex items-center gap-1.5 text-2xs text-cds-helper transition-colors hover:text-cds-text"
                title="Version history — coming soon"
              >
                <History className="h-3.5 w-3.5" /> History
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <Markdown>{active.content}</Markdown>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={NotebookText}
            title="No note selected"
            description="Select a note from the list or create a new one to start writing."
            action={
              <Button variant="primary" onClick={createNote}>
                <Plus className="h-4 w-4" /> New note
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
