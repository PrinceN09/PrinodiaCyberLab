"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { AppDTO } from "./types";

const EMPTY = {
  company: "",
  jobTitle: "",
  location: "",
  workplaceType: "",
  employmentType: "",
  salary: "",
  url: "",
  applicationUrl: "",
  notes: "",
};

export function AddApplicationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (app: AppDTO) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: form.company,
        jobTitle: form.jobTitle,
        location: form.location || undefined,
        workplaceType: form.workplaceType || undefined,
        employmentType: form.employmentType || undefined,
        salary: form.salary || undefined,
        url: form.url || undefined,
        applicationUrl: form.applicationUrl || undefined,
        notes: form.notes || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      onCreated({
        id: created.id,
        company: created.company,
        jobTitle: created.jobTitle,
        location: created.location ?? null,
        workplaceType: created.workplaceType ?? null,
        employmentType: created.employmentType ?? null,
        status: created.status,
        source: "MANUAL",
        matchScore: null,
        salary: created.salary ?? null,
        url: created.url ?? null,
        applicationUrl: created.applicationUrl ?? null,
        jobPostingId: null,
        appliedDate: null,
        savedAt: created.savedAt ?? new Date().toISOString(),
        lastActivityAt: created.lastActivityAt ?? new Date().toISOString(),
        followUpDate: null,
        followUpCompleted: false,
        recruiterName: null,
        resumeVersion: null,
        coverLetterId: null,
        nextInterviewAt: null,
        nextInterviewType: null,
        interviewCount: 0,
        assessmentCount: 0,
        offerDecision: null,
        attention: [],
        updatedAt: new Date().toISOString(),
      });
      setForm({ ...EMPTY });
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add the application");
    }
  }

  const valid = form.company.trim() && form.jobTitle.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add application"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving ? "Adding…" : "Add application"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-cds-text-secondary">
          Track a role you found outside job discovery. It&apos;ll be labelled as a
          manual entry.
        </p>
        {error && (
          <p role="alert" className="border border-cds-red/40 bg-cds-red/10 px-3 py-2 text-xs text-cds-red">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="add-company">Company *</Label>
            <Input
              id="add-company"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="add-title">Job title *</Label>
            <Input
              id="add-title"
              value={form.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="add-location">Location</Label>
            <Input
              id="add-location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="add-salary">Salary</Label>
            <Input
              id="add-salary"
              value={form.salary}
              onChange={(e) => set("salary", e.target.value)}
              placeholder="e.g. $90k–$110k"
            />
          </div>
          <div>
            <Label htmlFor="add-workplace">Workplace</Label>
            <Select
              id="add-workplace"
              value={form.workplaceType}
              onChange={(e) => set("workplaceType", e.target.value)}
            >
              <option value="">—</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ON_SITE">On-site</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="add-employment">Employment</Label>
            <Select
              id="add-employment"
              value={form.employmentType}
              onChange={(e) => set("employmentType", e.target.value)}
            >
              <option value="">—</option>
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="add-url">Job URL</Label>
            <Input
              id="add-url"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://"
            />
          </div>
          <div>
            <Label htmlFor="add-apply">Apply URL</Label>
            <Input
              id="add-apply"
              value={form.applicationUrl}
              onChange={(e) => set("applicationUrl", e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="add-notes">Notes</Label>
          <Textarea
            id="add-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
