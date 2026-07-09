"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldHalf,
  Mail,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { APP_VERSION } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="border border-cds-border bg-cds-layer shadow-2xl">
        <div className="px-8 pt-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center bg-cds-blue">
              <ShieldHalf className="h-4 w-4 text-white" strokeWidth={2.25} />
            </div>
            <span className="text-base font-semibold tracking-tight text-cds-text">
              Prinodia<span className="text-cds-blue"> CyberLab</span>
            </span>
          </div>

          <h1 className="mt-7 text-2xl font-semibold tracking-tight text-cds-text">
            Reset password
          </h1>
          <p className="mt-1.5 text-sm text-cds-text-secondary">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="px-8 pb-8 pt-6">
            <div className="flex items-start gap-3 border border-cds-green/40 bg-cds-green/10 p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cds-green" />
              <p className="text-xs leading-relaxed text-cds-text-secondary">
                If an account exists for{" "}
                <span className="text-cds-text">{email || "that address"}</span>,
                a password reset link is on its way.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 border border-cds-border-strong text-sm font-medium text-cds-text transition-colors hover:bg-cds-layer-accent"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="px-8 pb-7 pt-6">
            <label className="mb-1.5 block text-xs font-medium text-cds-text-secondary">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full border-0 border-b border-cds-border bg-cds-field pl-9 pr-3 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 bg-cds-blue text-sm font-medium text-white transition-colors hover:bg-cds-blue-hover disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  Send reset link <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <Link
              href="/login"
              className="mt-4 flex items-center justify-center gap-1.5 text-xs text-cds-link hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </form>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between px-1 text-2xs text-cds-helper">
        <span>© {new Date().getFullYear()} Prinodia</span>
        <span>Prinodia CyberLab · v{APP_VERSION}</span>
      </div>
    </div>
  );
}
