"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  FilePlus2,
  Pin,
  PinOff,
  Folder as FolderIcon,
  Eye,
  X,
  Maximize2,
  Minimize2,
  Check,
  Loader2,
  Tag as TagIcon,
  Trash2,
  SlidersHorizontal,
  NotebookText,
  ChevronDown,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, relativeTime, formatDate } from "@/lib/utils";

type Folder = { id: string; name: string };
type Tag = { id: string; name: string };
type Note = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  content: string;
  pinned: boolean;
  folderId: string | null;
  folder: Folder | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
};

type SaveState = "idle" | "saving" | "saved";

const CATEGORY_SUGGESTIONS = [
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

type DetailForm = {
  title: string;
  category: string;
  folderName: string;
  tags: string;
  description: string;
};

export function NotesClient({
  initialNotes,
  initialFolders,
}: {
  initialNotes: Note[];
  initialFolders: Folder[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [activeId, setActiveId] = useState<string | null>(
    initialNotes[0]?.id ?? null
  );
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFull, setPreviewFull] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = notes.find((n) => n.id === activeId) ?? null;

  const filtered = notes.filter((n) => {
    const q = query.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.category ?? "").toLowerCase().includes(q) ||
      n.tags.some((t) => t.name.toLowerCase().includes(q))
    );
  });
  const pinned = filtered.filter((n) => n.pinned);
  const others = filtered.filter((n) => !n.pinned);

  // Close preview on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    if (previewOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Autosave (title / content)
  const persist = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      setSaveState("saving");
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, ...updated } : n))
        );
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1400);
      }
    },
    []
  );

  function edit(patch: { title?: string; content?: string }) {
    if (!active) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === active.id ? { ...n, ...patch } : n))
    );
    if (timer.current) clearTimeout(timer.current);
    const id = active.id;
    timer.current = setTimeout(() => persist(id, patch), 800);
  }

  // Resolve a folder name to an id (create if new)
  async function resolveFolder(name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = folders.find(
      (f) => f.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.id;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [...prev, folder]);
      return folder.id;
    }
    return null;
  }

  // Create
  async function createNote(detail?: DetailForm) {
    const folderId = detail?.folderName
      ? await resolveFolder(detail.folderName)
      : null;
    const tags = detail?.tags
      ? detail.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    const heading = detail?.title?.trim() || "Untitled note";
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: heading,
        category: detail?.category?.trim() || null,
        description: detail?.description?.trim() || null,
        folderId,
        tags,
        content: `# ${heading}\n\n${
          detail?.description?.trim() ? `> ${detail.description.trim()}\n\n` : ""
        }`,
      }),
    });
    if (res.ok) {
      const note: Note = await res.json();
      setNotes((prev) => [
        { ...note, folder: note.folder ?? null, tags: note.tags ?? [] },
        ...prev,
      ]);
      setActiveId(note.id);
      setNewOpen(false);
    }
  }

  // Save metadata (Details modal)
  async function saveDetails(form: DetailForm) {
    if (!active) return;
    const folderId = form.folderName
      ? await resolveFolder(form.folderName)
      : null;
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch(`/api/notes/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim() || active.title,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        folderId,
        tags,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setNotes((prev) =>
        prev.map((n) => (n.id === active.id ? { ...n, ...updated } : n))
      );
      setDetailsOpen(false);
    }
  }

  async function togglePin(note: Note) {
    const next = !note.pinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned: next } : n))
    );
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: next }),
    });
  }

  async function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) {
      setActiveId(notes.find((n) => n.id !== id)?.id ?? null);
    }
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
  }

  function NoteRow({ n }: { n: Note }) {
    return (
      <button
        onClick={() => setActiveId(n.id)}
        className={cn(
          "flex w-full flex-col items-start gap-1.5 border-b border-cds-border px-4 py-3 text-left transition-colors",
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
        {n.description && (
          <span className="line-clamp-1 text-2xs text-cds-helper">
            {n.description}
          </span>
        )}
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-1.5 truncate text-2xs text-cds-helper">
            {n.category && <span className="text-cds-link">{n.category}</span>}
            {n.folder && (
              <span className="flex items-center gap-1">
                <FolderIcon className="h-3 w-3" />
                {n.folder.name}
              </span>
            )}
          </span>
          <span className="shrink-0 text-2xs text-cds-helper">
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
            Notes / Wiki
          </span>
          <span className="text-2xs text-cds-helper">{notes.length}</span>
        </div>
        <div className="space-y-2 border-b border-cds-border p-4">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setNewOpen(true)}
          >
            <FilePlus2 className="h-4 w-4" /> New detailed note
          </Button>
          <button
            onClick={() => createNote()}
            className="flex w-full items-center justify-center gap-2 border border-cds-border px-4 py-2 text-xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
          >
            <Plus className="h-3.5 w-3.5" /> Quick note
          </button>
          <div className="relative">
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
              {query ? `No notes match “${query}”.` : "No notes yet."}
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
              {pinned.length > 0 && others.length > 0 && (
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

      {/* CENTER — Editor only */}
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
                <span className="text-cds-link">{active.category}</span>
              )}
              <span className="flex items-center gap-1.5">
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
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="ghost" onClick={() => setDetailsOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" /> Details
              </Button>
              <Button variant="ghost" onClick={() => togglePin(active)}>
                {active.pinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPreviewFull(false);
                  setPreviewOpen(true);
                }}
              >
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button variant="ghost" onClick={() => remove(active.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Document header (Confluence-style) */}
          <div className="mx-auto w-full max-w-4xl px-8 pt-8">
            <input
              value={active.title}
              onChange={(e) => edit({ title: e.target.value })}
              placeholder="Untitled note"
              className="w-full bg-transparent text-3xl font-semibold tracking-tight text-cds-text placeholder:text-cds-helper focus:outline-none"
            />
            {active.description && (
              <p className="mt-2 text-sm italic text-cds-text-secondary">
                {active.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-cds-border pb-4 text-2xs text-cds-helper">
              {active.category && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-cds-blue" />
                  {active.category}
                </span>
              )}
              <span>Created {formatDate(active.createdAt)}</span>
              <span>Updated {formatDate(active.updatedAt)}</span>
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

          {/* Editor body */}
          <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 px-8 pb-8 pt-4">
            <textarea
              value={active.content}
              onChange={(e) => edit({ content: e.target.value })}
              spellCheck
              placeholder="Start writing your documentation in Markdown…"
              className="h-full w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-cds-text-secondary focus:outline-none"
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

      {/* Preview modal (large, centered, fullscreen option) */}
      {previewOpen && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8">
          <div
            className="absolute inset-0"
            onClick={() => setPreviewOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Note preview"
            className={cn(
              "relative z-10 flex animate-fade-in flex-col border border-cds-border bg-cds-layer shadow-2xl",
              previewFull
                ? "h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]"
                : "h-[85vh] w-full max-w-4xl"
            )}
          >
            <div className="flex items-center justify-between border-b border-cds-border px-6 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Eye className="h-4 w-4 shrink-0 text-cds-blue" />
                <span className="truncate text-sm font-semibold text-cds-text">
                  {active.title || "Untitled"}
                </span>
                <span className="hidden text-2xs text-cds-helper sm:inline">
                  · Preview
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewFull((f) => !f)}
                  aria-label={previewFull ? "Exit full screen" : "Full screen"}
                  title={previewFull ? "Exit full screen" : "Full screen"}
                  className="flex h-8 w-8 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
                >
                  {previewFull ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Close preview"
                  title="Close"
                  className="flex h-8 w-8 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-8 py-8">
                <h1 className="mb-1 text-3xl font-semibold tracking-tight text-cds-text">
                  {active.title || "Untitled"}
                </h1>
                <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-cds-border pb-4 text-2xs text-cds-helper">
                  {active.category && (
                    <span className="text-cds-link">{active.category}</span>
                  )}
                  {active.folder && <span>{active.folder.name}</span>}
                  <span>Updated {formatDate(active.updatedAt)}</span>
                </div>
                <Markdown>{active.content}</Markdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New detailed note modal */}
      <NoteMetaModal
        open={newOpen}
        title="New detailed note"
        submitLabel="Create note"
        folders={folders}
        onClose={() => setNewOpen(false)}
        onSubmit={(form) => createNote(form)}
      />

      {/* Edit details modal */}
      {active && (
        <NoteMetaModal
          open={detailsOpen}
          title="Note details"
          submitLabel="Save details"
          folders={folders}
          initial={{
            title: active.title,
            category: active.category ?? "",
            folderName: active.folder?.name ?? "",
            tags: active.tags.map((t) => t.name).join(", "),
            description: active.description ?? "",
          }}
          onClose={() => setDetailsOpen(false)}
          onSubmit={(form) => saveDetails(form)}
        />
      )}
    </div>
  );
}

// ── Shared metadata form modal ──────────────────
function NoteMetaModal({
  open,
  title,
  submitLabel,
  folders,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  folders: Folder[];
  initial?: DetailForm;
  onClose: () => void;
  onSubmit: (form: DetailForm) => void | Promise<void>;
}) {
  const empty: DetailForm = {
    title: "",
    category: "",
    folderName: "",
    tags: "",
    description: "",
  };
  const [form, setForm] = useState<DetailForm>(initial ?? empty);
  const [saving, setSaving] = useState(false);

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (open) setForm(initial ?? empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : submitLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            value={form.title}
            placeholder="e.g. SIEM Onboarding Runbook"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <Input
              list="note-categories"
              value={form.category}
              placeholder="SOC Operations"
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <datalist id="note-categories">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Folder</Label>
            <div className="relative">
              <Input
                list="note-folders"
                value={form.folderName}
                placeholder="Choose or create…"
                onChange={(e) =>
                  setForm({ ...form, folderName: e.target.value })
                }
              />
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
            </div>
            <datalist id="note-folders">
              {folders.map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <Label>Tags (comma-separated)</Label>
          <Input
            value={form.tags}
            placeholder="Splunk, Detection, MITRE ATT&CK"
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>
        <div>
          <Label>Description / summary</Label>
          <Textarea
            rows={3}
            value={form.description}
            placeholder="A short summary of what this note covers."
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}
