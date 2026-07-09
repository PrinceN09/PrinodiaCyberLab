"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldHalf,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Lightbulb,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { APP_VERSION, tipOfTheDay } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tip] = useState(() => tipOfTheDay());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      if (res.ok) {
        const next =
          new URLSearchParams(window.location.search).get("next") || "/";
        router.push(next);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sign in failed. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Card */}
      <div className="border border-cds-border bg-cds-layer shadow-2xl">
        <div className="px-8 pt-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center bg-cds-blue">
              <ShieldHalf className="h-4 w-4 text-white" strokeWidth={2.25} />
            </div>
            <span className="text-base font-semibold tracking-tight text-cds-text">
              Prinodia<span className="text-cds-blue"> CyberLab</span>
            </span>
          </div>

          {/* Heading */}
          <h1 className="mt-7 text-2xl font-semibold tracking-tight text-cds-text">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-cds-text-secondary">
            Sign in to your cybersecurity learning workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="px-8 pb-7 pt-6">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 border border-cds-red/40 bg-cds-red/10 px-3 py-2.5 text-xs text-cds-red">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
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

          <label className="mb-1.5 mt-5 block text-xs font-medium text-cds-text-secondary">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
            <input
              type={showPw ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full border-0 border-b border-cds-border bg-cds-field pl-9 pr-10 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-cds-helper hover:text-cds-text"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Remember + forgot */}
          <div className="mt-4 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-cds-text-secondary">
              <button
                type="button"
                role="checkbox"
                aria-checked={remember}
                onClick={() => setRemember((r) => !r)}
                className={`flex h-4 w-4 items-center justify-center border ${
                  remember
                    ? "border-cds-blue bg-cds-blue"
                    : "border-cds-border-strong bg-transparent"
                }`}
              >
                {remember && (
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M3 8l3.5 3.5L13 4" />
                  </svg>
                )}
              </button>
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-cds-link hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign in */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 bg-cds-blue text-sm font-medium text-white transition-colors hover:bg-cds-blue-hover disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              <>
                Sign in <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-cds-helper">
            Don&apos;t have an account?{" "}
            <span className="text-cds-text-secondary">
              Contact your administrator.
            </span>
          </p>
        </form>

        {/* Cyber Tip of the Day */}
        <div className="border-t border-cds-border bg-cds-bg px-8 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-cds-blue/10">
              <Lightbulb className="h-3.5 w-3.5 text-cds-blue" />
            </div>
            <div>
              <div className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                Cyber Tip of the Day
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-cds-text-secondary">
                {tip}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between px-1 text-2xs text-cds-helper">
        <span>© {new Date().getFullYear()} Prinodia</span>
        <span>Prinodia CyberLab · v{APP_VERSION}</span>
      </div>
    </div>
  );
}
