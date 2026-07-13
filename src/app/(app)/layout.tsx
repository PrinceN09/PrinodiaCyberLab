import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  return (
    // Full-viewport shell. `h-dvh` tracks the *visible* viewport (mobile
    // toolbars included) so the body never becomes a scroll container and
    // the sidebar/topbar can't drift on scroll. `overflow-hidden` confines
    // all vertical scrolling to <main>.
    <div className="flex h-dvh overflow-hidden bg-cds-bg">
      <Sidebar
        user={session ? { name: session.name, role: session.role } : undefined}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        {/* The ONLY vertical scroll container. `min-h-0` lets this flex
            child shrink so overflow works instead of pushing the shell. */}
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
