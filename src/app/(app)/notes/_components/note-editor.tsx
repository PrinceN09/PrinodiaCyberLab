"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import {
  applyCommand,
  continueListOnEnter,
  shortcutFor,
  type EditorCommandId,
} from "@/lib/notes/editor-commands";
import { EditorToolbar } from "./editor-toolbar";

export type NoteEditorHandle = {
  /** Jump the editor to a character offset (used by the TOC). */
  jumpTo: (offset: number) => void;
};

/**
 * Markdown editor: toolbar + shortcut handling + list continuation.
 * Controlled component — parent owns the content (optimistic state).
 */
export const NoteEditor = forwardRef<
  NoteEditorHandle,
  {
    content: string;
    onChange: (content: string) => void;
    onFlush: () => void;
  }
>(function NoteEditor({ content, onChange, onFlush }, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    jumpTo: (offset: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(offset, offset);
      // Approximate scroll position from the line's share of the text.
      const before = ta.value.slice(0, offset).split("\n").length;
      const total = ta.value.split("\n").length || 1;
      ta.scrollTop = Math.max(
        0,
        (before / total) * ta.scrollHeight - ta.clientHeight / 3
      );
    },
  }));

  const run = useCallback(
    (id: EditorCommandId) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const next = applyCommand(id, {
        value: ta.value,
        selStart: ta.selectionStart,
        selEnd: ta.selectionEnd,
      });
      onChange(next.value);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(next.selStart, next.selEnd);
      });
    },
    [onChange]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;

    // Cmd/Ctrl+S → save now.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onFlush();
      return;
    }

    const command = shortcutFor(e);
    if (command) {
      e.preventDefault();
      run(command);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      const next = continueListOnEnter({
        value: ta.value,
        selStart: ta.selectionStart,
        selEnd: ta.selectionEnd,
      });
      if (next) {
        e.preventDefault();
        onChange(next.value);
        requestAnimationFrame(() => {
          ta.setSelectionRange(next.selStart, next.selEnd);
        });
      }
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorToolbar onRun={run} />
      <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 px-8 pb-8 pt-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck
          aria-label="Note content"
          placeholder="Start writing in Markdown… Try # headings, - [ ] checklists, ```code fences``` or > [!NOTE] callouts."
          className="h-full w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-cds-text-secondary focus:outline-none"
        />
      </div>
    </div>
  );
});
