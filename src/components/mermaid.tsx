"use client";

import { useEffect, useRef, useState } from "react";

let initialized = false;

export function MermaidRender({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`m${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      if (!initialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
          themeVariables: {
            background: "#161616",
            primaryColor: "#1f1f1f",
            primaryBorderColor: "#0f62fe",
            primaryTextColor: "#f4f4f4",
            lineColor: "#6f6f6f",
            fontFamily: "IBM Plex Sans, sans-serif",
          },
        });
        initialized = true;
      }
      try {
        const { svg } = await mermaid.render(
          idRef.current,
          code || "flowchart TD\n  A[Empty]"
        );
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Invalid diagram syntax");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="border border-cds-red/40 bg-cds-red/10 p-4 text-xs text-cds-red">
        Diagram error: {error}
      </div>
    );
  }

  return <div ref={ref} className="flex justify-center [&_svg]:max-w-full" />;
}
