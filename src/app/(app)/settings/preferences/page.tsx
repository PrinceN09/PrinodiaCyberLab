import { PageHeader } from "@/components/ui/page-header";
import { PreferencesClient } from "./preferences-client";

export const metadata = { title: "Preferences" };

export default function PreferencesPage() {
  return (
    <div>
      <PageHeader
        breadcrumb="Settings"
        title="Preferences"
        description="Fine-tune editor and workspace behavior."
      />
      <PreferencesClient />
    </div>
  );
}
