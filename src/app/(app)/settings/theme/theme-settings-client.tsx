"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";

export function ThemeSettingsClient() {
  const { theme, setTheme } = useTheme();

  const options = [
    {
      value: "dark" as const,
      label: "Carbon Dark",
      description: "IBM Carbon Gray 100 — default, low-glare for long analyst sessions.",
      icon: Moon,
      swatch: ["#161616", "#1f1f1f", "#0f62fe"],
    },
    {
      value: "light" as const,
      label: "Carbon Light",
      description: "IBM Carbon White — high-contrast for bright environments and printing.",
      icon: Sun,
      swatch: ["#ffffff", "#f4f4f4", "#0f62fe"],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <span className="text-2xs text-cds-helper">Saved automatically</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {options.map((o) => {
              const Icon = o.icon;
              const active = theme === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => setTheme(o.value)}
                  className={`relative border p-4 text-left transition-colors ${
                    active
                      ? "border-cds-blue bg-cds-blue/5"
                      : "border-cds-border hover:border-cds-border-strong"
                  }`}
                >
                  {active && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center bg-cds-blue">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-cds-text-secondary" />
                    <span className="text-sm font-semibold text-cds-text">
                      {o.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-cds-text-secondary">
                    {o.description}
                  </p>
                  <div className="mt-3 flex gap-1">
                    {o.swatch.map((c) => (
                      <span
                        key={c}
                        className="h-6 w-8 border border-cds-border"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-2xs text-cds-helper">
            Your preference is stored on this device and applied before the page
            renders to avoid any flash.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
