import { PageHeader } from "@/components/ui/page-header";
import { ThemeSettingsClient } from "./theme-settings-client";

export const metadata = { title: "Theme" };

export default function ThemeSettingsPage() {
  return (
    <div>
      <PageHeader
        breadcrumb="Settings"
        title="Theme"
        description="Choose how Prinodia CyberLab looks. Dark is the default."
      />
      <ThemeSettingsClient />
    </div>
  );
}
