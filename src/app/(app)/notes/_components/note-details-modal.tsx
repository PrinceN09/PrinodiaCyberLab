"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import {
  CATEGORY_SUGGESTIONS,
  DIFFICULTY_META,
  STATUS_META,
  type Category,
  type Folder,
  type Note,
  type NoteDifficulty,
  type NoteStatus,
} from "./types";

export type DetailForm = {
  title: string;
  summary: string;
  description: string;
  categoryName: string;
  folderName: string;
  tags: string;
  difficulty: NoteDifficulty | "";
  status: NoteStatus;
};

export const EMPTY_DETAIL_FORM: DetailForm = {
  title: "",
  summary: "",
  description: "",
  categoryName: "",
  folderName: "",
  tags: "",
  difficulty: "",
  status: "DRAFT",
};

export function detailFormFromNote(note: Note): DetailForm {
  return {
    title: note.title,
    summary: note.summary ?? "",
    description: note.description ?? "",
    categoryName: note.category?.name ?? "",
    folderName: note.folder?.name ?? "",
    tags: note.tags.map((t) => t.name).join(", "),
    difficulty: note.difficulty ?? "",
    status: note.status,
  };
}

export function NoteDetailsModal({
  open,
  title,
  submitLabel,
  folders,
  categories,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  folders: Folder[];
  categories: Category[];
  initial?: DetailForm;
  onClose: () => void;
  onSubmit: (form: DetailForm) => void | Promise<void>;
}) {
  const [form, setForm] = useState<DetailForm>(initial ?? EMPTY_DETAIL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (open) {
      setForm(initial ?? EMPTY_DETAIL_FORM);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof DetailForm>(key: K, value: DetailForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save details.");
    } finally {
      setSaving(false);
    }
  }

  const categoryNames = new Set([
    ...categories.map((c) => c.name),
    ...CATEGORY_SUGGESTIONS,
  ]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          {error && (
            <span className="mr-auto text-xs text-cds-red">{error}</span>
          )}
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
          <Label htmlFor="note-title">Title</Label>
          <Input
            id="note-title"
            value={form.title}
            placeholder="e.g. SIEM Onboarding Runbook"
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="note-summary">Summary (one line)</Label>
          <Input
            id="note-summary"
            value={form.summary}
            placeholder="Shown in the notes list."
            onChange={(e) => set("summary", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="note-category">Category</Label>
            <Input
              id="note-category"
              list="note-categories"
              value={form.categoryName}
              placeholder="SOC Operations"
              onChange={(e) => set("categoryName", e.target.value)}
            />
            <datalist id="note-categories">
              {[...categoryNames].sort().map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="note-folder">Folder</Label>
            <div className="relative">
              <Input
                id="note-folder"
                list="note-folders"
                value={form.folderName}
                placeholder="Choose or create…"
                onChange={(e) => set("folderName", e.target.value)}
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="note-status">Status</Label>
            <Select
              id="note-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as NoteStatus)}
            >
              {(Object.keys(STATUS_META) as NoteStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="note-difficulty">Difficulty</Label>
            <Select
              id="note-difficulty"
              value={form.difficulty}
              onChange={(e) =>
                set("difficulty", e.target.value as NoteDifficulty | "")
              }
            >
              <option value="">Not set</option>
              {(Object.keys(DIFFICULTY_META) as NoteDifficulty[]).map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_META[d].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="note-tags">Tags (comma-separated)</Label>
          <Input
            id="note-tags"
            value={form.tags}
            placeholder="Splunk, Detection, MITRE ATT&CK"
            onChange={(e) => set("tags", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="note-description">Description</Label>
          <Textarea
            id="note-description"
            rows={3}
            value={form.description}
            placeholder="What this note covers, prerequisites, sources…"
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
