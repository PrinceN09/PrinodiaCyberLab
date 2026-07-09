import type { Config } from "tailwindcss";

/**
 * Prinodia CyberLab design system.
 *
 * Colors are driven entirely by CSS custom properties (see globals.css),
 * stored as space-separated RGB channels so Tailwind opacity modifiers
 * (e.g. `bg-cds-blue/10`) work. Themes are switched by the `data-theme`
 * attribute on <html>. NO hard-coded colors should appear in components —
 * always reference these `cds-*` tokens.
 */
const token = (name: string) => `rgb(var(--cds-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cds: {
          // Layers
          bg: token("bg"),
          "code-bg": token("code-bg"),
          layer: token("layer"),
          "layer-accent": token("layer-accent"),
          field: token("field"),
          hover: token("hover"),
          selected: token("selected"),
          // Borders
          border: token("border"),
          "border-subtle": token("border-subtle"),
          "border-strong": token("border-strong"),
          // Text
          text: token("text"),
          "text-secondary": token("text-secondary"),
          helper: token("helper"),
          disabled: token("disabled"),
          // Interactive (IBM Blue)
          blue: token("blue"),
          "blue-hover": token("blue-hover"),
          "blue-active": token("blue-active"),
          link: token("link"),
          "link-hover": token("link-hover"),
          // Support
          green: token("green"),
          yellow: token("yellow"),
          red: token("red"),
          orange: token("orange"),
          purple: token("purple"),
          cyan: token("cyan"),
          teal: token("teal"),
          magenta: token("magenta"),
        },
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        DEFAULT: "0px",
        sm: "2px",
      },
      maxWidth: {
        "8xl": "96rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
