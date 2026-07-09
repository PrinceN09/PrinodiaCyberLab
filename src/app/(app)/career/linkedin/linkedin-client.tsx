"use client";

import { useMemo, useState } from "react";
import { Save, CheckCircle2, Circle, Linkedin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";

type Checklist = Record<string, boolean>;
type Profile = {
  headline: string;
  about: string;
  skills: string[];
  certifications: string[];
  featured: string;
  checklist: Checklist;
};

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "photo", label: "Professional profile photo" },
  { key: "banner", label: "Custom background banner (security theme)" },
  { key: "headline", label: "Keyword-rich headline (role + tools)" },
  { key: "about", label: "Compelling About section with metrics" },
  { key: "featured", label: "Featured projects / write-ups pinned" },
  { key: "skills", label: "Top skills reflect target role" },
  { key: "certifications", label: "Certifications listed & verified" },
  { key: "openToWork", label: "Open to work enabled (recruiters only)" },
];

const DEFAULT: Profile = {
  headline: "",
  about: "",
  skills: [],
  certifications: [],
  featured: "",
  checklist: {},
};

export function LinkedInClient({ initial }: { initial: Profile | null }) {
  const [p, setP] = useState<Profile>({ ...DEFAULT, ...(initial ?? {}) });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const completion = useMemo(() => {
    const done = CHECKLIST_ITEMS.filter((i) => p.checklist[i.key]).length;
    return Math.round((done / CHECKLIST_ITEMS.length) * 100);
  }, [p.checklist]);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/linkedin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (res.ok) setSavedAt(new Date().toLocaleTimeString());
    setSaving(false);
  }

  function toggle(key: string) {
    setP({ ...p, checklist: { ...p.checklist, [key]: !p.checklist[key] } });
  }

  return (
    <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-cds-helper">
          {savedAt ? `Saved at ${savedAt}` : "Unsaved changes autosave on Save"}
        </div>
        <Button variant="primary" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-cds-blue" /> Headline
              </CardTitle>
              <span className="text-2xs text-cds-helper">
                {p.headline.length}/220
              </span>
            </CardHeader>
            <CardBody>
              <Textarea
                rows={2}
                maxLength={220}
                placeholder="Aspiring SOC Analyst | SIEM • Threat Detection • Incident Response | Splunk & MITRE ATT&CK"
                value={p.headline}
                onChange={(e) => setP({ ...p, headline: e.target.value })}
              />
              <p className="mt-2 text-2xs text-cds-helper">
                Lead with your target role, then the tools and frameworks
                recruiters search for.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <span className="text-2xs text-cds-helper">
                {p.about.length}/2600
              </span>
            </CardHeader>
            <CardBody>
              <Textarea
                rows={7}
                maxLength={2600}
                value={p.about}
                onChange={(e) => setP({ ...p, about: e.target.value })}
              />
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Skills</CardTitle>
              </CardHeader>
              <CardBody>
                <Label>Comma-separated</Label>
                <Input
                  value={p.skills.join(", ")}
                  onChange={(e) =>
                    setP({
                      ...p,
                      skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.skills.map((s) => (
                    <span
                      key={s}
                      className="border border-cds-border px-2 py-0.5 text-2xs text-cds-text-secondary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardBody>
                <Label>Comma-separated</Label>
                <Input
                  value={p.certifications.join(", ")}
                  onChange={(e) =>
                    setP({
                      ...p,
                      certifications: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.certifications.map((s) => (
                    <span
                      key={s}
                      className="border border-cds-border px-2 py-0.5 text-2xs text-cds-text-secondary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Featured</CardTitle>
            </CardHeader>
            <CardBody>
              <Textarea
                rows={3}
                placeholder="Projects, write-ups, or posts to pin to your profile."
                value={p.featured}
                onChange={(e) => setP({ ...p, featured: e.target.value })}
              />
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Optimization Checklist</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cds-text-secondary">
                    Profile completion
                  </span>
                  <span className="font-semibold text-cds-text">
                    {completion}%
                  </span>
                </div>
                <ProgressBar
                  value={completion}
                  tone={completion === 100 ? "green" : "blue"}
                  className="mt-2"
                />
              </div>
              <div className="divide-y divide-cds-border border-t border-cds-border">
                {CHECKLIST_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => toggle(item.key)}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    {p.checklist[item.key] ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-cds-green" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-cds-helper" />
                    )}
                    <span
                      className={
                        p.checklist[item.key]
                          ? "text-sm text-cds-text-secondary line-through"
                          : "text-sm text-cds-text"
                      }
                    >
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
