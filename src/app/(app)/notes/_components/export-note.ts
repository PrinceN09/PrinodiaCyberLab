import type { Note } from "./types";

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(title: string) {
  return (title.trim() || "note").replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
}

/** Markdown export: YAML front matter + raw content. */
export function exportMarkdown(note: Note) {
  const front = [
    "---",
    `title: ${JSON.stringify(note.title)}`,
    ...(note.summary ? [`summary: ${JSON.stringify(note.summary)}`] : []),
    ...(note.category ? [`category: ${JSON.stringify(note.category.name)}`] : []),
    ...(note.folder ? [`folder: ${JSON.stringify(note.folder.name)}`] : []),
    ...(note.tags.length > 0
      ? [`tags: [${note.tags.map((t) => JSON.stringify(t.name)).join(", ")}]`]
      : []),
    `status: ${note.status}`,
    ...(note.difficulty ? [`difficulty: ${note.difficulty}`] : []),
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    "---",
    "",
  ].join("\n");
  download(
    new Blob([front + note.content], { type: "text/markdown;charset=utf-8" }),
    `${safeName(note.title)}.md`
  );
}

const WORD_STYLES = `
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #161616; line-height: 1.5; }
  h1 { font-size: 20pt; } h2 { font-size: 15pt; } h3 { font-size: 12.5pt; }
  pre, code { font-family: Consolas, 'Courier New', monospace; font-size: 9.5pt; }
  pre { background: #f4f4f4; border: 1pt solid #d0d0d0; padding: 8pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1pt solid #8d8d8d; padding: 4pt 8pt; text-align: left; }
  th { background: #e8e8e8; }
  blockquote { border-left: 3pt solid #0f62fe; margin-left: 0; padding-left: 10pt; color: #525252; }
  img { max-width: 100%; }
`;

/**
 * Word export: wraps the rendered preview HTML in a Word-compatible
 * HTML document (.doc). Word opens these natively with styling intact.
 */
export function exportWord(note: Note, renderedHtml: string) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${note.title}</title><style>${WORD_STYLES}</style></head>
<body>${renderedHtml}</body></html>`;
  download(
    new Blob([html], { type: "application/msword" }),
    `${safeName(note.title)}.doc`
  );
}

/**
 * PDF export: browser print dialog scoped to the preview (print CSS
 * hides everything else). The user picks "Save as PDF".
 */
export function exportPdf() {
  window.print();
}
