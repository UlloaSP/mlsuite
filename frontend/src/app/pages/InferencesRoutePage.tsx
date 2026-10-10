import { InferencesPage } from "@/features/inferences/pages/inferences-page";
import { OrganizationInferenceExportButton } from "@/features/schemas/components/OrganizationInferenceExportButton";

/** The inference table, with its export from the schemas feature. */
export function InferencesRoutePage() {
  return (
    <InferencesPage
      renderExportAction={(selection) => <OrganizationInferenceExportButton {...selection} />}
    />
  );
}
