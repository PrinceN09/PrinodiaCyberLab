import { AuthBackground } from "@/components/auth/auth-background";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-cds-bg px-4 py-10">
      <AuthBackground />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
