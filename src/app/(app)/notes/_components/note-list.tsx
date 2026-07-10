"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  FilePlus2,
  Pin,
  Star,
  Folder as FolderIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, relativeTime } from "@/lib/utils";
import { STATUS_META, type Note, type NoteStatus } from "./types";

type Filter = "ALL" | "FAVORITES" | "PINNED" | NoteStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "FAVORITES", label: "Favorites" },
  { value: "PINNED", label: "Pinned" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

/** Searches title, content, tags, folder, and category. */
function matches(note: Note, q: string): boolean {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    note.title.toLowerCase().includes(query) ||
    note.content.toLowerCase().includes(query) ||
    (note.summary ?? "").toLowerCase().includes(query) ||
    (note.category?.name ?? "").toLowerCase().includes(query) ||
    (note.folder?.name ?? "").toLowerCase().includes(query) ||
    note.tags.some((t) => t.name.toLowerCase().includes(query))
  );
}

export function NoteList({
  notes,
  activeId,
  onSelect,
  onNewDetailed,
  onQuickNote,
}: {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewDetailed: () => void;
  onQuickNote: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (!matches(n, query)) return false;
      switch (filter) {
        case "ALL":
          // Archived notes only show under their own filter (or via search).
          return n.status !== "ARCHIVED" || query.length > 0;
        case "FAVORITES":
          return n.favorite;
        case "PINNED":
          return n.pinned;
        default:
          return n.status === filter;
      }
    });
  }, [notes, query, filter]);

  const pinned = filtered.filter((n) => n.pinned);
  const others = filtered.filter((n) => !n.pinned);

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
      <div className="flex items-center justify-between border-b border-cds-border px-4 py-2.5">
        <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          Notes / Wiki
        </span>
        <span className="text-2xs tabular-nums text-cds-helper">
          {filtered.length}/{notes.length}
        </span>
      </div>

      <div className="space-y-2 border-b border-cds-border p-4">
        <Button variant="primary" className="w-full" onClick={onNewDetailed}>
          <FilePlus2 className="h-4 w-4" /> New detailed note
        </Button>
        <button
          onClick={onQuickNote}
          className="flex w-full items-center justify-center gap-2 border border-cds-border px-4 py-2 text-xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
        >
          <Plus className="h-3.5 w-3.5" /> Quick note
        </button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, content, tags…"
            aria-label="Search notes"
            className="h-9 w-full border-b border-cds-border bg-cds-field pl-9 pr-3 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter notes">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "px-2 py-1 text-2xs transition-colors",
                filter === f.value
                  ? "bg-cds-blue/15 font-semibold text-cds-link"
                  : "text-cds-helper hover:bg-cds-layer-accent hover:text-cds-text"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-cds-helper">
            {query
              ? `No notes match “${query}”.`
              : filter !== "ALL"
                ? "Nothing here yet."
                : "No notes yet."}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <SectionLabel>Pinned</SectionLabel>
            )}
            {pinned.map((n) => (
              <NoteRow key={n.id} note={n} active={activeId === n.id} onSelect={onSelect} />
            ))}
            {pinned.length > 0 && others.length > 0 && (
              <SectionLabel>All notes</SectionLabel>
            )}
            {others.map((n) => (
              <NoteRow key={n.id} note={n} active={activeId === n.id} onSelect={onSelect} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cds-bg px-4 pt-3 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
      {children}
    </div>
  );
}

function NoteRow({
  note,
  active,
  onSelect,
}: {
  note: Note;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const status = STATUS_META[note.status];
  return (
    <button
      onClick={() => onSelect(note.id)}
      className={cn(
        "flex w-full flex-col items-start gap-1.5 border-b border-cds-border px-4 py-3 text-left transition-colors",
        active ? "bg-cds-layer-accent" : "hover:bg-cds-layer"
      )}
    >
      <div className="flex w-full items-center gap-2">
        {note.pinned && (
          <Pin className="h-3 w-3 shrink-0 text-cds-blue" fill="currentColor" />
        )}
        {note.favorite && (
          <Star
            className="h-3 w-3 shrink-0 text-cds-yellow"
            fill="currentColor"
          />
        )}
        <span className="truncate text-sm font-medium text-cds-text">
          {note.title || "Untitled"}
        </span>
      </div>
      {note.summary && (
        <span className="line-clamp-1 text-2xs text-cds-helper">
          {note.summary}
        </span>
      )}
      <div className="flex w-full items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-2xs text-cds-helper">
          {note.status !== "DRAFT" && (
            <span
              className={cn(
                "shrink-0",
                note.status === "COMPLETED" ? "text-cds-green" : "text-cds-link"
              )}
            >
              {status.label}
            </span>
          )}
          {note.category && (
            <span className="truncate text-cds-link">{note.category.name}</span>
          )}
          {note.folder && (
            <span className="flex shrink-0 items-center gap-1">
              <FolderIcon className="h-3 w-3" />
              {note.folder.name}
            </span>
          )}
        </span>
        <span className="shrink-0 text-2xs text-cds-helper">
          {relativeTime(note.updatedAt)}
        </span>
      </div>
    </button>
  );
}
