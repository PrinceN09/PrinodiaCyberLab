"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Save, Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-cds-helper">
      Loading editor…
    </div>
  ),
});

type Snippet = {
  id: string;
  title: string;
  description: string | null;
  language: string;
  code: string;
  updatedAt: string | Date;
  tags: { id: string; name: string }[];
};

const LANGUAGES = [
  "python",
  "shell",
  "sql",
  "yaml",
  "javascript",
  "typescript",
  "powershell",
  "json",
  "go",
];

const langTone: Record<string, string> = {
  python: "blue",
  shell: "green",
  sql: "cyan",
  yaml: "purple",
  powershell: "teal",
};

export function CodeClient({ initialSnippets }: { initialSnippets: Snippet[] }) {
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [activeId, setActiveId] = useState<string | null>(
    initialSnippets[0]?.id ?? null
  );
  const [code, setCode] = useState(initialSnippets[0]?.code ?? "");
  const [language, setLanguage] = useState(initialSnippets[0]?.language ?? "python");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = snippets.find((s) => s.id === activeId) ?? null;

  function open(s: Snippet) {
    setActiveId(s.id);
    setCode(s.code);
    setLanguage(s.language);
  }

  async function createSnippet() {
    const res = await fetch("/api/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New snippet",
        language: "python",
        code: "# New snippet\n",
      }),
    });
    if (res.ok) {
      const s = await res.json();
      setSnippets([{ ...s, tags: [] }, ...snippets]);
      open({ ...s, tags: [] });
    }
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    const res = await fetch(`/api/snippets/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSnippets(
        snippets.map((s) =>
          s.id === updated.id ? { ...s, code, language } : s
        )
      );
    }
    setSaving(false);
  }

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex w-80 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
        <div className="border-b border-cds-border p-4">
          <Button variant="primary" className="w-full" onClick={createSnippet}>
            <Plus className="h-4 w-4" /> New snippet
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {snippets.map((s) => (
            <button
              key={s.id}
              onClick={() => open(s)}
              className={cn(
                "flex w-full flex-col items-start gap-1.5 border-b border-cds-border px-4 py-3 text-left transition-colors",
                activeId === s.id ? "bg-cds-layer-accent" : "hover:bg-cds-layer"
              )}
            >
              <div className="flex w-full items-center gap-2">
                <Code2 className="h-3.5 w-3.5 shrink-0 text-cds-helper" />
                <span className="truncate text-sm font-medium text-cds-text">
                  {s.title}
                </span>
              </div>
              {s.description && (
                <span className="line-clamp-2 text-2xs text-cds-helper">
                  {s.description}
                </span>
              )}
              <Badge tone={(langTone[s.language] as any) ?? "gray"}>
                {s.language}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <div className="flex items-center justify-between border-b border-cds-border px-6 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-cds-text">
                  {active.title}
                </div>
                <div className="mt-0.5 text-2xs text-cds-helper">
                  Updated {relativeTime(active.updatedAt)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-9 border border-cds-border bg-cds-field px-2 text-xs text-cds-text focus:border-cds-blue focus:outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={copy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-cds-green" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="primary" onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <MonacoEditor
                height="100%"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v ?? "")}
                options={{
                  fontSize: 13,
                  fontFamily: "var(--font-plex-mono), monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16 },
                  smoothScrolling: true,
                  renderLineHighlight: "line",
                  automaticLayout: true,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-cds-helper">
            Select or create a snippet.
          </div>
        )}
      </div>
    </div>
  );
}
