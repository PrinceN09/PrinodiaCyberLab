"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/theme-provider";

export function MermaidRender({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`m${Math.random().toString(36).slice(2)}`);
  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Import the self-contained ESM bundle: the default "mermaid"
      // entry resolves to mermaid.core.mjs, whose externalized deps
      // (d3, dompurify, …) can fail webpack's browser interop with
      // "Cannot read properties of undefined (reading 'split')".
      // The .esm.min bundle ships all deps inside one module.
      const mermaid = (await import("mermaid/dist/mermaid.esm.min.mjs"))
        .default;
      const dark = theme === "dark";
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "neutral",
        securityLevel: "strict",
        themeVariables: {
          background: dark ? "#161616" : "#ffffff",
          primaryColor: dark ? "#1f1f1f" : "#f4f4f4",
          primaryBorderColor: "#0f62fe",
          primaryTextColor: dark ? "#f4f4f4" : "#161616",
          lineColor: dark ? "#6f6f6f" : "#8d8d8d",
          fontFamily: "IBM Plex Sans, sans-serif",
        },
      });
      try {
        // Fresh id per render so mermaid re-parses on theme change.
        const { svg } = await mermaid.render(
          idRef.current + (dark ? "d" : "l"),
          code || "flowchart TD\n  A[Empty]"
        );
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Invalid diagram syntax");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (error) {
    return (
      <div className="border border-cds-red/40 bg-cds-red/10 p-4 text-xs text-cds-red">
        Diagram error: {error}
      </div>
    );
  }

  return <div ref={ref} className="flex justify-center [&_svg]:max-w-full" />;
}
