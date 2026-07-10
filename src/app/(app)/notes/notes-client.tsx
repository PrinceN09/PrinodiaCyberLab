"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pin,
  PinOff,
  Star,
  Eye,
  Trash2,
  SlidersHorizontal,
  NotebookText,
  FilePlus2,
  MoreHorizontal,
  Folder as FolderIcon,
  Tag as TagIcon,
  History,
  CopyPlus,
  Archive,
  ArchiveRestore,
  Download,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDate } from "@/lib/utils";
import { useAutoSave } from "@/hooks/use-autosave";
import { readingTimeMinutes, wordCount } from "@/lib/notes/markdown-utils";
import {
  apiFetch,
  DIFFICULTY_META,
  STATUS_META,
  type Category,
  type Folder,
  type Note,
} from "./_components/types";
import { NoteList } from "./_components/note-list";
import { NoteEditor, type NoteEditorHandle } from "./_components/note-editor";
import { NoteRail } from "./_components/note-rail";
import { SaveStatus } from "@/components/save-status";
import { PreviewModal } from "./_components/preview-modal";
import { VersionsModal } from "./_components/versions-modal";
import {
  detailFormFromNote,
  NoteDetailsModal,
  type DetailForm,
} from "./_components/note-details-modal";

export function NotesClient({
  initialNotes,
  initialFolders,
  initialCategories,
}: {
  initialNotes: Note[];
  initialFolders: Folder[];
  initialCategories: Category[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [activeId, setActiveId] = useState<string | null>(
    initialNotes.find((n) => n.status !== "ARCHIVED")?.id ?? null
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<NoteEditorHandle>(null);

  const active = notes.find((n) => n.id === activeId) ?? null;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // ── Auto-save (2s debounce, flush on switch/unload, retry) ──
  const saveNoteRequest = useCallback(
    async (
      id: string,
      patch: Record<string, unknown>,
      { keepalive }: { keepalive: boolean }
    ): Promise<Note> => {
      return apiFetch<Note>(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        keepalive,
      });
    },
    []
  );

  const autosave = useAutoSave<Note>({
    delay: 2000,
    save: saveNoteRequest,
    onSaved: (id, saved) => {
      // Only sync server-managed fields — never clobber text the
      // user may have typed while the request was in flight.
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, updatedAt: saved.updatedAt } : n))
      );
    },
  });

  // Optimistic edit for editor-owned fields (title/content).
  function edit(patch: { title?: string; content?: string }) {
    if (!active) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === active.id ? { ...n, ...patch } : n))
    );
    autosave.queue(active.id, patch);
  }

  // Switching notes saves the outgoing note immediately.
  const selectNote = useCallback(
    (id: string) => {
      const current = activeIdRef.current;
      if (current && current !== id) autosave.flush(current);
      setActiveId(id);
    },
    [autosave]
  );

  /**
   * Optimistic metadata patch with rollback. Content/title stay
   * local (the editor owns them via auto-save).
   */
  async function patchNote(
    id: string,
    patch: Record<string, unknown>,
    optimistic: Partial<Note>
  ) {
    const snapshot = notes.find((n) => n.id === id);
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...optimistic } : n))
    );
    try {
      const updated = await saveNoteRequest(id, patch, { keepalive: false });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, ...updated, content: n.content, title: n.title }
            : n
        )
      );
      return updated;
    } catch (err) {
      if (snapshot) {
        setNotes((prev) => prev.map((n) => (n.id === id ? snapshot : n)));
      }
      throw err;
    }
  }

  // ── Folder / category resolution (create on demand) ──
  async function resolveByName(
    name: string,
    list: { id: string; name: string }[],
    endpoint: string,
    add: (item: { id: string; name: string }) => void
  ): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = list.find(
      (f) => f.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.id;
    const created = await apiFetch<{ id: string; name: string }>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    add(created);
    return created.id;
  }

  const resolveFolder = (name: string) =>
    resolveByName(name, folders, "/api/folders", (f) =>
      setFolders((prev) => [...prev, f])
    );
  const resolveCategory = (name: string) =>
    resolveByName(name, categories, "/api/categories", (c) =>
      setCategories((prev) =>
        [...prev, c].sort((a, b) => a.name.localeCompare(b.name))
      )
    );

  async function formToPatch(form: DetailForm) {
    const [folderId, categoryId] = await Promise.all([
      form.folderName ? resolveFolder(form.folderName) : Promise.resolve(null),
      form.categoryName
        ? resolveCategory(form.categoryName)
        : Promise.resolve(null),
    ]);
    return {
      title: form.title.trim() || "Untitled note",
      summary: form.summary.trim() || null,
      description: form.description.trim() || null,
      folderId,
      categoryId,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      difficulty: form.difficulty || null,
      status: form.status,
    };
  }

  // ── Create / details / actions ──
  async function createNote(form?: DetailForm) {
    const base = form
      ? await formToPatch(form)
      : { title: "Untitled note", tags: [] as string[] };
    const heading = base.title ?? "Untitled note";
    const note = await apiFetch<Note>("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...base,
        content: `# ${heading}\n\n`,
      }),
    });
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
    setNewOpen(false);
  }

  async function saveDetails(form: DetailForm) {
    if (!active) return;
    autosave.flush(active.id); // serialize with pending content saves
    const patch = await formToPatch(form);
    const updated = await patchNote(active.id, patch, {});
    // Title is editable in the form — apply it locally too.
    setNotes((prev) =>
      prev.map((n) =>
        n.id === active.id ? { ...n, title: updated.title } : n
      )
    );
    setDetailsOpen(false);
  }

  function toggleFlag(note: Note, key: "pinned" | "favorite") {
    const next = !note[key];
    patchNote(note.id, { [key]: next }, { [key]: next }).catch(() => {
      // patchNote already rolled back
    });
  }

  function toggleArchive(note: Note) {
    const next = note.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED";
    patchNote(note.id, { status: next }, { status: next }).catch(() => {});
  }

  async function duplicate(note: Note) {
    autosave.flush(note.id);
    const copy = await apiFetch<Note>(`/api/notes/${note.id}/duplicate`, {
      method: "POST",
    });
    setNotes((prev) => [copy, ...prev]);
    setActiveId(copy.id);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this note? Its versions and attachments are removed too.")) {
      return;
    }
    autosave.discard(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) {
      setActiveId(notes.find((n) => n.id !== id)?.id ?? null);
    }
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
  }

  // Close the actions menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const menuActions = active
    ? [
        {
          icon: History,
          label: "Version history",
          run: () => setVersionsOpen(true),
        },
        { icon: CopyPlus, label: "Duplicate", run: () => void duplicate(active) },
        {
          icon: Download,
          label: "Export…",
          run: () => setPreviewOpen(true),
        },
        {
          icon: active.status === "ARCHIVED" ? ArchiveRestore : Archive,
          label: active.status === "ARCHIVED" ? "Unarchive" : "Archive",
          run: () => toggleArchive(active),
        },
        {
          icon: Trash2,
          label: "Delete",
          run: () => void remove(active.id),
          danger: true,
        },
      ]
    : [];

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* LEFT — Notes list */}
      <NoteList
        notes={notes}
        activeId={activeId}
        onSelect={selectNote}
        onNewDetailed={() => setNewOpen(true)}
        onQuickNote={() => void createNote()}
      />

      {/* CENTER — Editor */}
      {active ? (
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-cds-border px-6 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-2xs text-cds-helper">
              {active.folder && (
                <span className="flex items-center gap-1">
                  <FolderIcon className="h-3 w-3" />
                  {active.folder.name}
                </span>
              )}
              {active.folder && active.category && <span>/</span>}
              {active.category && (
                <span className="text-cds-link">{active.category.name}</span>
              )}
              <SaveStatus
                entry={autosave.statusFor(active.id)}
                onRetry={() => autosave.retry(active.id)}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="ghost" onClick={() => setDetailsOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" /> Details
              </Button>
              <Button
                variant="ghost"
                onClick={() => toggleFlag(active, "pinned")}
                aria-label={active.pinned ? "Unpin note" : "Pin note"}
                title={active.pinned ? "Unpin" : "Pin"}
              >
                {active.pinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => toggleFlag(active, "favorite")}
                aria-label={
                  active.favorite ? "Remove from favorites" : "Add to favorites"
                }
                title={active.favorite ? "Unfavorite" : "Favorite"}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    active.favorite && "text-cds-yellow"
                  )}
                  fill={active.favorite ? "currentColor" : "none"}
                />
              </Button>
              <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <div className="relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="More actions"
                  aria-expanded={menuOpen}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-30 min-w-44 border border-cds-border bg-cds-layer shadow-lg">
                    {menuActions.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => {
                          setMenuOpen(false);
                          a.run();
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-cds-layer-accent",
                          a.danger
                            ? "text-cds-red"
                            : "text-cds-text-secondary hover:text-cds-text"
                        )}
                      >
                        <a.icon className="h-3.5 w-3.5" /> {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Document header */}
              <div className="mx-auto w-full max-w-4xl px-8 pt-6">
                <input
                  value={active.title}
                  onChange={(e) => edit({ title: e.target.value })}
                  placeholder="Untitled note"
                  aria-label="Note title"
                  className="w-full bg-transparent text-3xl font-semibold tracking-tight text-cds-text placeholder:text-cds-helper focus:outline-none"
                />
                {active.summary && (
                  <p className="mt-1.5 text-sm italic text-cds-text-secondary">
                    {active.summary}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-cds-border pb-3 text-2xs text-cds-helper">
                  <Badge tone={STATUS_META[active.status].tone}>
                    {STATUS_META[active.status].label}
                  </Badge>
                  {active.difficulty && (
                    <Badge tone={DIFFICULTY_META[active.difficulty].tone}>
                      {DIFFICULTY_META[active.difficulty].label}
                    </Badge>
                  )}
                  <span>Created {formatDate(active.createdAt)}</span>
                  <span>Updated {formatDate(active.updatedAt)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {readingTimeMinutes(active.content)} min read ·{" "}
                    {wordCount(active.content)} words
                  </span>
                  {active.tags.length > 0 && (
                    <span className="flex flex-wrap items-center gap-1.5">
                      {active.tags.map((t) => (
                        <Badge key={t.id} tone="blue">
                          <TagIcon className="h-2.5 w-2.5" />
                          {t.name}
                        </Badge>
                      ))}
                    </span>
                  )}
                </div>
              </div>

              {/* Editor (toolbar + textarea) */}
              <NoteEditor
                ref={editorRef}
                content={active.content}
                onChange={(content) => edit({ content })}
                onFlush={() => autosave.flush(active.id)}
              />
            </div>

            {/* RIGHT — Outline / Related / Files */}
            <NoteRail
              key={active.id} // reset tab state per note
              noteId={active.id}
              content={active.content}
              onJump={(offset) => editorRef.current?.jumpTo(offset)}
              onOpenNote={selectNote}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={NotebookText}
            title="No note selected"
            description="Create a detailed note or pick one from the list to start writing."
            action={
              <Button variant="primary" onClick={() => setNewOpen(true)}>
                <FilePlus2 className="h-4 w-4" /> New detailed note
              </Button>
            }
          />
        </div>
      )}

      {/* Preview + export */}
      <PreviewModal
        open={previewOpen}
        note={active}
        onClose={() => setPreviewOpen(false)}
      />

      {/* Version history */}
      <VersionsModal
        open={versionsOpen}
        noteId={activeId}
        onClose={() => setVersionsOpen(false)}
        onRestored={(restored) => {
          autosave.discard(restored.id); // restored state wins over pending edits
          setNotes((prev) =>
            prev.map((n) => (n.id === restored.id ? { ...n, ...restored } : n))
          );
        }}
      />

      {/* New detailed note */}
      <NoteDetailsModal
        open={newOpen}
        title="New detailed note"
        submitLabel="Create note"
        folders={folders}
        categories={categories}
        onClose={() => setNewOpen(false)}
        onSubmit={(form) => createNote(form)}
      />

      {/* Edit details */}
      {active && (
        <NoteDetailsModal
          open={detailsOpen}
          title="Note details"
          submitLabel="Save details"
          folders={folders}
          categories={categories}
          initial={detailFormFromNote(active)}
          onClose={() => setDetailsOpen(false)}
          onSubmit={saveDetails}
        />
      )}
    </div>
  );
}
