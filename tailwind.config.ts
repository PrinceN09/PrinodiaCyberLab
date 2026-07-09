import type { Config } from "tailwindcss";

/**
 * Prinodia CyberLab — design tokens inspired by the IBM Carbon Design System
 * (Gray 100 dark theme). Sharp corners, precise spacing, restrained color.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cds: {
          // Layers
          bg: "#161616",
          layer: "#1f1f1f",
          "layer-accent": "#262626",
          field: "#262626",
          hover: "#2c2c2c",
          selected: "#333333",
          // Borders
          border: "#2e2e2e",
          "border-subtle": "#262626",
          "border-strong": "#6f6f6f",
          // Text
          text: "#f4f4f4",
          "text-secondary": "#c6c6c6",
          helper: "#8d8d8d",
          disabled: "#6f6f6f",
          // Interactive (IBM Blue)
          blue: "#0f62fe",
          "blue-hover": "#0353e9",
          "blue-active": "#002d9c",
          link: "#78a9ff",
          "link-hover": "#a6c8ff",
          // Support
          green: "#42be65",
          yellow: "#f1c21b",
          red: "#fa4d56",
          orange: "#ff832b",
          purple: "#be95ff",
          cyan: "#33b1ff",
          teal: "#08bdba",
          magenta: "#ff7eb6",
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
    },
  },
  plugins: [],
};

export default config;
