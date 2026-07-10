/**
 * Pure text transformations for the markdown editor. Every command
 * takes the current value + selection and returns the next value +
 * selection, so they're trivially testable and framework-agnostic.
 */

export type EditorState = {
  value: string;
  selStart: number;
  selEnd: number;
};

export type EditorCommandId =
  | "bold"
  | "italic"
  | "strikethrough"
  | "inline-code"
  | "link"
  | "image"
  | "h1"
  | "h2"
  | "h3"
  | "bullet-list"
  | "numbered-list"
  | "checklist"
  | "quote"
  | "callout-note"
  | "callout-tip"
  | "callout-warning"
  | "code-block"
  | "mermaid"
  | "table"
  | "hr";

/** Wraps the selection (or a placeholder) with before/after markers. */
function wrap(
  state: EditorState,
  before: string,
  after: string,
  placeholder: string
): EditorState {
  const { value, selStart, selEnd } = state;
  const selected = value.slice(selStart, selEnd) || placeholder;
  const next =
    value.slice(0, selStart) + before + selected + after + value.slice(selEnd);
  return {
    value: next,
    selStart: selStart + before.length,
    selEnd: selStart + before.length + selected.length,
  };
}

/** Toggles a prefix on every line the selection touches. */
function toggleLinePrefix(
  state: EditorState,
  prefix: string,
  { numbered = false }: { numbered?: boolean } = {}
): EditorState {
  const { value, selStart, selEnd } = state;
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const lineEndIdx = value.indexOf("\n", selEnd);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const allPrefixed = lines.every(
    (l) => l.startsWith(prefix) || (numbered && /^\d+\.\s/.test(l)) || !l.trim()
  );

  const nextLines = lines.map((l, i) => {
    if (!l.trim()) return l;
    if (allPrefixed) {
      return numbered ? l.replace(/^\d+\.\s/, "") : l.slice(prefix.length);
    }
    // Strip competing list/heading markers before applying the new one.
    const bare = l.replace(/^(#{1,6}\s|>\s?|- \[[ x]\]\s|[-*]\s|\d+\.\s)/, "");
    return numbered ? `${i + 1}. ${bare}` : prefix + bare;
  });

  const nextBlock = nextLines.join("\n");
  return {
    value: value.slice(0, lineStart) + nextBlock + value.slice(lineEnd),
    selStart: lineStart,
    selEnd: lineStart + nextBlock.length,
  };
}

/** Inserts a block snippet on its own lines at the cursor. */
function insertBlock(state: EditorState, snippet: string): EditorState {
  const { value, selStart } = state;
  const needsLeadingNL = selStart > 0 && value[selStart - 1] !== "\n";
  const block = `${needsLeadingNL ? "\n\n" : ""}${snippet}\n`;
  const next = value.slice(0, selStart) + block + value.slice(state.selEnd);
  const cursor = selStart + block.length;
  return { value: next, selStart: cursor, selEnd: cursor };
}

const TABLE_SNIPPET = [
  "| Column | Column | Column |",
  "| ------ | ------ | ------ |",
  "|        |        |        |",
  "|        |        |        |",
].join("\n");

const MERMAID_SNIPPET = [
  "```mermaid",
  "flowchart TD",
  "  A[Start] --> B{Decision}",
  "  B -->|Yes| C[Outcome]",
  "  B -->|No| D[Alternative]",
  "```",
].join("\n");

export function applyCommand(
  id: EditorCommandId,
  state: EditorState
): EditorState {
  switch (id) {
    case "bold":
      return wrap(state, "**", "**", "bold text");
    case "italic":
      return wrap(state, "*", "*", "italic text");
    case "strikethrough":
      return wrap(state, "~~", "~~", "struck text");
    case "inline-code":
      return wrap(state, "`", "`", "code");
    case "link":
      return wrap(state, "[", "](https://)", "link text");
    case "image":
      return wrap(state, "![", "](https://)", "alt text");
    case "h1":
      return togglePrefixSingle(state, "# ");
    case "h2":
      return togglePrefixSingle(state, "## ");
    case "h3":
      return togglePrefixSingle(state, "### ");
    case "bullet-list":
      return toggleLinePrefix(state, "- ");
    case "numbered-list":
      return toggleLinePrefix(state, "1. ", { numbered: true });
    case "checklist":
      return toggleLinePrefix(state, "- [ ] ");
    case "quote":
      return toggleLinePrefix(state, "> ");
    case "callout-note":
      return insertBlock(state, "> [!NOTE]\n> ");
    case "callout-tip":
      return insertBlock(state, "> [!TIP]\n> ");
    case "callout-warning":
      return insertBlock(state, "> [!WARNING]\n> ");
    case "code-block":
      return insertBlock(state, "```bash\n\n```");
    case "mermaid":
      return insertBlock(state, MERMAID_SNIPPET);
    case "table":
      return insertBlock(state, TABLE_SNIPPET);
    case "hr":
      return insertBlock(state, "---");
  }
}

/** Headings replace any existing heading level on the current line. */
function togglePrefixSingle(state: EditorState, prefix: string): EditorState {
  const { value, selStart } = state;
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const lineEndIdx = value.indexOf("\n", lineStart);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const line = value.slice(lineStart, lineEnd);

  const bare = line.replace(/^#{1,6}\s/, "");
  const next = line.startsWith(prefix) ? bare : prefix + bare;
  const delta = next.length - line.length;
  return {
    value: value.slice(0, lineStart) + next + value.slice(lineEnd),
    selStart: Math.max(lineStart, selStart + delta),
    selEnd: Math.max(lineStart, selStart + delta),
  };
}

/**
 * Continues lists on Enter: "- ", "1. ", "- [ ] ", "> ".
 * Pressing Enter on an empty list item terminates the list instead.
 * Returns null when default newline behavior should apply.
 */
export function continueListOnEnter(state: EditorState): EditorState | null {
  const { value, selStart, selEnd } = state;
  if (selStart !== selEnd) return null;

  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const line = value.slice(lineStart, selStart);
  const m = /^(\s*)(- \[[ x]\] |[-*] |(\d+)\. |> )/.exec(line);
  if (!m) return null;

  const content = line.slice(m[0].length);
  if (!content.trim()) {
    // Empty item → remove the marker and break out of the list.
    const next = value.slice(0, lineStart) + value.slice(selStart);
    return { value: next, selStart: lineStart, selEnd: lineStart };
  }

  let marker = m[2];
  if (m[3]) marker = `${parseInt(m[3], 10) + 1}. `;
  if (marker.startsWith("- [")) marker = "- [ ] ";
  const insertion = `\n${m[1]}${marker}`;
  const next = value.slice(0, selStart) + insertion + value.slice(selEnd);
  const cursor = selStart + insertion.length;
  return { value: next, selStart: cursor, selEnd: cursor };
}

/** Maps a keydown event to a command id (Cmd on macOS, Ctrl elsewhere). */
export function shortcutFor(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): EditorCommandId | null {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return null;
  const key = e.key.toLowerCase();

  if (e.altKey) {
    if (key === "1") return "h1";
    if (key === "2") return "h2";
    if (key === "3") return "h3";
    return null;
  }
  if (e.shiftKey) {
    if (key === "c") return "checklist";
    if (key === "7") return "numbered-list";
    if (key === "8") return "bullet-list";
    if (key === "9") return "quote";
    return null;
  }
  if (key === "b") return "bold";
  if (key === "i") return "italic";
  if (key === "e") return "inline-code";
  if (key === "k") return "link";
  return null;
}
