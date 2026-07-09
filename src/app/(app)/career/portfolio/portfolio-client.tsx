"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  Github,
  Star,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type Item = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  url: string | null;
  repoUrl: string | null;
  tech: string[];
  featured: boolean;
};

const CATEGORIES = ["Project", "Lab", "Detection", "Writeup", "Certification", "Tool"];
const EMPTY: Partial<Item> = { category: "Project", tech: [], featured: false };

export function PortfolioClient({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const isNew = !editing.id;
    const res = await fetch(
      isNew ? "/api/portfolio" : `/api/portfolio/${editing.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      }
    );
    if (res.ok) {
      const saved = await res.json();
      setItems((prev) =>
        isNew ? [saved, ...prev] : prev.map((i) => (i.id === saved.id ? saved : i))
      );
      setEditing(null);
    }
    setSaving(false);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-cds-helper">{items.length} items</div>
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border border-cds-border bg-cds-layer">
          <EmptyState
            icon={FolderGit2}
            title="No portfolio items yet"
            description="Showcase labs, detections, and write-ups that demonstrate your skills to recruiters."
            action={
              <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
                <Plus className="h-4 w-4" /> Add item
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px overflow-hidden border border-cds-border bg-cds-border md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className="group flex flex-col bg-cds-layer p-5">
              <div className="flex items-start justify-between">
                <Badge tone={it.featured ? "blue" : "gray"}>
                  {it.featured && (
                    <Star className="h-2.5 w-2.5" fill="currentColor" />
                  )}
                  {it.category}
                </Badge>
                <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setEditing(it)}
                    className="flex h-6 w-6 items-center justify-center text-cds-helper hover:text-cds-text"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    className="flex h-6 w-6 items-center justify-center text-cds-helper hover:text-cds-red"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-cds-text">
                {it.title}
              </h3>
              {it.description && (
                <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-cds-text-secondary">
                  {it.description}
                </p>
              )}
              {it.tech.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {it.tech.map((t) => (
                    <span
                      key={t}
                      className="border border-cds-border px-1.5 py-0.5 text-2xs text-cds-helper"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3 border-t border-cds-border pt-3">
                {it.url && (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-2xs text-cds-link hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Live
                  </a>
                )}
                {it.repoUrl && (
                  <a
                    href={it.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-2xs text-cds-link hover:underline"
                  >
                    <Github className="h-3 w-3" /> Repo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit portfolio item" : "Add portfolio item"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editing.description ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={editing.category ?? "Project"}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-cds-text-secondary">
                  <input
                    type="checkbox"
                    checked={editing.featured ?? false}
                    onChange={(e) =>
                      setEditing({ ...editing, featured: e.target.checked })
                    }
                  />
                  Featured
                </label>
              </div>
            </div>
            <div>
              <Label>Tech (comma-separated)</Label>
              <Input
                value={(editing.tech ?? []).join(", ")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    tech: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Live URL</Label>
                <Input
                  value={editing.url ?? ""}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                />
              </div>
              <div>
                <Label>Repo URL</Label>
                <Input
                  value={editing.repoUrl ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, repoUrl: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
