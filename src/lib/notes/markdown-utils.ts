/**
 * Client-safe markdown helpers shared by the renderer, the table of
 * contents, and note metadata (reading time). No server imports here.
 */

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

export type Heading = {
  depth: 1 | 2 | 3;
  text: string;
  id: string;
  /** Character offset of the heading line in the source markdown. */
  offset: number;
};

/**
 * Extracts H1–H3 headings (ATX style) for the table of contents,
 * skipping fenced code blocks. Ids match the renderer's heading ids
 * (pure slugs — duplicate headings share an id and the TOC scrolls
 * to the first occurrence).
 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  let offset = 0;

  for (const line of markdown.split("\n")) {
    const lineOffset = offset;
    offset += line.length + 1; // account for the newline

    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const depth = m[1].length as 1 | 2 | 3;
    const text = m[2]
      .replace(/\*\*|__|\*|_|~~|`/g, "") // strip inline formatting
      .trim();
    if (!text) continue;
    headings.push({ depth, text, id: slugify(text), offset: lineOffset });
  }
  return headings;
}

/** Word count, ignoring code fences and markdown punctuation noise. */
export function wordCount(markdown: string): number {
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, " ");
  const words = withoutFences
    .replace(/[#>*_~`|[\]()-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

/** Estimated reading time in whole minutes (≈200 wpm, minimum 1). */
export function readingTimeMinutes(markdown: string): number {
  return Math.max(1, Math.round(wordCount(markdown) / 200));
}
