"use client";

import { cloneElement, isValidElement, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Copy,
  Info,
  Lightbulb,
  AlertTriangle,
  OctagonAlert,
  Flag,
} from "lucide-react";
import { MermaidRender } from "@/components/mermaid";
import { slugify } from "@/lib/notes/markdown-utils";
import { cn } from "@/lib/utils";

// ── helpers ─────────────────────────────────────

/** Recursively collects the plain text of a React node tree. */
function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeText(node.props.children);
  }
  return "";
}

// ── code blocks ─────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // clipboard unavailable (permissions/insecure context) — ignore
        }
      }}
      aria-label={copied ? "Copied" : "Copy code"}
      title="Copy code"
      className="flex h-7 items-center gap-1.5 px-2 text-2xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-cds-green" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copy
        </>
      )}
    </button>
  );
}

function CodeBlock({ children }: { children?: ReactNode }) {
  // <pre> children is the <code class="language-x"> element.
  const codeEl = Array.isArray(children) ? children[0] : children;
  let language = "";
  let text = "";
  if (isValidElement<{ className?: string; children?: ReactNode }>(codeEl)) {
    language =
      /language-([\w-]+)/.exec(codeEl.props.className ?? "")?.[1] ?? "";
    text = nodeText(codeEl.props.children).replace(/\n$/, "");
  } else {
    text = nodeText(children).replace(/\n$/, "");
  }

  if (language === "mermaid") {
    return (
      <div className="my-4 border border-cds-border bg-cds-layer p-4">
        <MermaidRender code={text} />
      </div>
    );
  }

  return (
    <div className="group/code my-4 border border-cds-border">
      <div className="flex items-center justify-between border-b border-cds-border bg-cds-layer-accent px-3 py-1">
        <span className="font-mono text-2xs uppercase tracking-wider text-cds-helper">
          {language || "text"}
        </span>
        <CopyButton text={text} />
      </div>
      <pre className="!my-0 !border-0">{codeEl}</pre>
    </div>
  );
}

// ── callouts ────────────────────────────────────

const CALLOUTS: Record<
  string,
  { label: string; icon: typeof Info; className: string }
> = {
  NOTE: {
    label: "Note",
    icon: Info,
    className: "border-l-cds-blue bg-cds-blue/5 text-cds-link",
  },
  TIP: {
    label: "Tip",
    icon: Lightbulb,
    className: "border-l-cds-green bg-cds-green/5 text-cds-green",
  },
  IMPORTANT: {
    label: "Important",
    icon: Flag,
    className: "border-l-cds-purple bg-cds-purple/5 text-cds-purple",
  },
  WARNING: {
    label: "Warning",
    icon: AlertTriangle,
    className: "border-l-cds-yellow bg-cds-yellow/5 text-cds-yellow",
  },
  DANGER: {
    label: "Danger",
    icon: OctagonAlert,
    className: "border-l-cds-red bg-cds-red/5 text-cds-red",
  },
};

const CALLOUT_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|DANGER)\]\s*/i;

/** Strips the `[!KIND]` marker from the blockquote's first paragraph. */
function stripMarker(node: ReactNode): ReactNode {
  if (typeof node === "string") return node.replace(CALLOUT_RE, "");
  if (Array.isArray(node)) {
    let stripped = false;
    return node.map((child) => {
      if (stripped) return child;
      const text = nodeText(child);
      if (!text.trim()) return child;
      stripped = true;
      return stripMarker(child);
    });
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return cloneElement(node, undefined, stripMarker(node.props.children));
  }
  return node;
}

function Blockquote({ children }: { children?: ReactNode }) {
  const text = nodeText(children);
  const match = CALLOUT_RE.exec(text);
  const kind = match ? CALLOUTS[match[1].toUpperCase()] : undefined;

  if (!kind) return <blockquote>{children}</blockquote>;

  const Icon = kind.icon;
  return (
    <div
      className={cn(
        "my-4 border border-l-[3px] border-cds-border p-4",
        kind.className
      )}
      role="note"
    >
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
        {kind.label}
      </div>
      <div className="text-sm text-cds-text-secondary [&>p]:!my-1 [&>blockquote]:!my-1">
        {stripMarker(children)}
      </div>
    </div>
  );
}

// ── main component ──────────────────────────────

export function Markdown({ children }: { children: string }) {
  // Heading ids must match extractHeadings(). Ids derive purely from
  // the heading text so they're stable across re-renders; duplicate
  // headings share an id and the TOC scrolls to the first occurrence.
  const components = useMemo<Components>(() => {
    const headingId = (node: ReactNode) => slugify(nodeText(node));
    return {
      h1: ({ children }) => (
        <h1 id={headingId(children)} className="scroll-mt-20">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 id={headingId(children)} className="scroll-mt-20">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 id={headingId(children)} className="scroll-mt-20">
          {children}
        </h3>
      ),
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
      blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
      a: ({ href, children }) => {
        const external = /^https?:\/\//.test(href ?? "");
        return (
          <a
            href={href}
            {...(external && { target: "_blank", rel: "noreferrer noopener" })}
          >
            {children}
          </a>
        );
      },
      img: ({ src, alt }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={typeof src === "string" ? src : undefined}
          alt={alt ?? ""}
          loading="lazy"
          className="my-4 max-h-[480px] max-w-full border border-cds-border"
        />
      ),
    };
  }, []);

  return (
    <div className="prose-cyber max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
