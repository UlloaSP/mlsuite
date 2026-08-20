import { InferencesPage } from "@/features/inferences/pages/inferences-page";
import { OrganizationInferenceExportButton } from "@/features/schemas/components/OrganizationInferenceExportButton";

export function InferencesRoutePage() {
  return (
    <InferencesPage
      renderExportAction={(items) => <OrganizationInferenceExportButton items={items} />}
    />
  );
}
