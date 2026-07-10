"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Megaphone,
  SquareCode,
  Table2,
  Minus,
  GitBranch,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditorCommandId } from "@/lib/notes/editor-commands";

type ToolButton = {
  id: EditorCommandId;
  icon: typeof Bold;
  label: string;
  shortcut?: string;
};

const INLINE_TOOLS: ToolButton[] = [
  { id: "bold", icon: Bold, label: "Bold", shortcut: "⌘B" },
  { id: "italic", icon: Italic, label: "Italic", shortcut: "⌘I" },
  { id: "strikethrough", icon: Strikethrough, label: "Strikethrough" },
  { id: "inline-code", icon: Code, label: "Inline code", shortcut: "⌘E" },
  { id: "link", icon: Link2, label: "Link", shortcut: "⌘K" },
  { id: "image", icon: ImageIcon, label: "Image" },
];

const HEADING_TOOLS: ToolButton[] = [
  { id: "h1", icon: Heading1, label: "Heading 1", shortcut: "⌘⌥1" },
  { id: "h2", icon: Heading2, label: "Heading 2", shortcut: "⌘⌥2" },
  { id: "h3", icon: Heading3, label: "Heading 3", shortcut: "⌘⌥3" },
];

const BLOCK_TOOLS: ToolButton[] = [
  { id: "bullet-list", icon: List, label: "Bullet list", shortcut: "⌘⇧8" },
  {
    id: "numbered-list",
    icon: ListOrdered,
    label: "Numbered list",
    shortcut: "⌘⇧7",
  },
  { id: "checklist", icon: ListChecks, label: "Checklist", shortcut: "⌘⇧C" },
  { id: "quote", icon: Quote, label: "Quote", shortcut: "⌘⇧9" },
  { id: "code-block", icon: SquareCode, label: "Code block" },
  { id: "table", icon: Table2, label: "Table" },
  { id: "mermaid", icon: GitBranch, label: "Mermaid diagram" },
  { id: "hr", icon: Minus, label: "Horizontal rule" },
];

const CALLOUT_OPTIONS: { id: EditorCommandId; label: string }[] = [
  { id: "callout-note", label: "Note callout" },
  { id: "callout-tip", label: "Tip callout" },
  { id: "callout-warning", label: "Warning callout" },
];

function IconButton({
  tool,
  onRun,
}: {
  tool: ToolButton;
  onRun: (id: EditorCommandId) => void;
}) {
  const Icon = tool.icon;
  const title = tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label;
  return (
    <button
      onMouseDown={(e) => e.preventDefault()} // keep textarea focus
      onClick={() => onRun(tool.id)}
      aria-label={tool.label}
      title={title}
      className="flex h-8 w-8 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-cds-border" aria-hidden="true" />;
}

export function EditorToolbar({
  onRun,
}: {
  onRun: (id: EditorCommandId) => void;
}) {
  const [calloutOpen, setCalloutOpen] = useState(false);
  const calloutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calloutOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!calloutRef.current?.contains(e.target as Node)) {
        setCalloutOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [calloutOpen]);

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-cds-border px-4 py-1"
    >
      {HEADING_TOOLS.map((t) => (
        <IconButton key={t.id} tool={t} onRun={onRun} />
      ))}
      <Divider />
      {INLINE_TOOLS.map((t) => (
        <IconButton key={t.id} tool={t} onRun={onRun} />
      ))}
      <Divider />
      {BLOCK_TOOLS.map((t) => (
        <IconButton key={t.id} tool={t} onRun={onRun} />
      ))}
      <Divider />
      <div className="relative" ref={calloutRef}>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setCalloutOpen((o) => !o)}
          aria-label="Insert callout"
          aria-expanded={calloutOpen}
          title="Callout"
          className={cn(
            "flex h-8 items-center gap-1 px-2 text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text",
            calloutOpen && "bg-cds-layer-accent text-cds-text"
          )}
        >
          <Megaphone className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </button>
        {calloutOpen && (
          <div className="absolute left-0 top-full z-20 min-w-40 border border-cds-border bg-cds-layer shadow-lg">
            {CALLOUT_OPTIONS.map((o) => (
              <button
                key={o.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onRun(o.id);
                  setCalloutOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
