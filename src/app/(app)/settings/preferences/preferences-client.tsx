"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <div className="text-sm text-cds-text">{label}</div>
        <div className="text-2xs text-cds-helper">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`flex h-5 w-9 shrink-0 items-center px-0.5 transition-colors ${
          value ? "justify-end bg-cds-blue" : "justify-start bg-cds-layer-accent"
        }`}
      >
        <span className="h-4 w-4 bg-white" />
      </button>
    </div>
  );
}

export function PreferencesClient() {
  const [prefs, setPrefs] = useState({
    autosave: true,
    livePreview: true,
    wordWrap: false,
    compactSidebar: false,
    confirmDelete: true,
  });

  function set(key: keyof typeof prefs, v: boolean) {
    setPrefs((p) => ({ ...p, [key]: v }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Editor</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-cds-border py-0">
          <Toggle
            label="Autosave"
            description="Automatically save notes and documents as you type"
            value={prefs.autosave}
            onChange={(v) => set("autosave", v)}
          />
          <Toggle
            label="Live Markdown preview"
            description="Show a rendered preview alongside the editor"
            value={prefs.livePreview}
            onChange={(v) => set("livePreview", v)}
          />
          <Toggle
            label="Word wrap in code editor"
            description="Wrap long lines in the code workspace"
            value={prefs.wordWrap}
            onChange={(v) => set("wordWrap", v)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-cds-border py-0">
          <Toggle
            label="Compact sidebar"
            description="Reduce sidebar spacing for a denser layout"
            value={prefs.compactSidebar}
            onChange={(v) => set("compactSidebar", v)}
          />
          <Toggle
            label="Confirm before delete"
            description="Ask for confirmation before deleting items"
            value={prefs.confirmDelete}
            onChange={(v) => set("confirmDelete", v)}
          />
        </CardBody>
      </Card>

      <p className="text-2xs text-cds-helper">
        Preferences apply to this session. Persisting preferences to your account
        is planned for a future release.
      </p>
    </div>
  );
}
