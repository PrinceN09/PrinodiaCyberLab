"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type SidebarContextValue = {
  /** True when the sidebar is slid out of view. */
  hidden: boolean;
  setHidden: (v: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "prinodia-cyberlab-sidebar-hidden";
const ATTR = "data-sidebar-hidden";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Initial render matches the server (visible) to avoid a hydration
  // mismatch. The pre-paint `sidebarScript` has already applied the correct
  // visual state via the `data-sidebar-hidden` attribute on <html>, so there
  // is no flash — we only sync React state to it after mount.
  const [hidden, setHiddenState] = useState(false);

  useEffect(() => {
    setHiddenState(
      document.documentElement.getAttribute(ATTR) === "true"
    );
  }, []);

  const setHidden = useCallback((v: boolean) => {
    setHiddenState(v);
    if (v) {
      document.documentElement.setAttribute(ATTR, "true");
    } else {
      document.documentElement.removeAttribute(ATTR);
    }
    try {
      localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
    } catch {
      /* ignore (private mode, etc.) */
    }
  }, []);

  const toggle = useCallback(() => {
    setHidden(document.documentElement.getAttribute(ATTR) !== "true");
  }, [setHidden]);

  return (
    <SidebarContext.Provider value={{ hidden, setHidden, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

/**
 * Runs before paint to apply the persisted sidebar state to <html> so the
 * layout renders correctly on first paint (no hydration flash). Injected as a
 * raw <script> in the document head, mirroring the theme no-flash script.
 */
export const sidebarScript = `
(function() {
  try {
    if (localStorage.getItem('${STORAGE_KEY}') === 'true') {
      document.documentElement.setAttribute('${ATTR}', 'true');
    }
  } catch (e) {}
})();
`;
