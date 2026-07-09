"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={loading}
      aria-label="Sign out"
      title="Sign out"
      className="flex h-8 w-8 shrink-0 items-center justify-center text-cds-helper transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
