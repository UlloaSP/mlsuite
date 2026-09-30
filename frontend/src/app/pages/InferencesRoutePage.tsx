import { InferencesPage } from "@/features/inferences/pages/inferences-page";
import { OrganizationInferenceExportButton } from "@/features/schemas/components/OrganizationInferenceExportButton";
import { PredictionRunDetails } from "@/features/schemas/components/PredictionRunDetails";

/** The inference table, with its export and row preview from the schemas feature. */
export function InferencesRoutePage() {
  return (
    <InferencesPage
      renderExportAction={(items) => <OrganizationInferenceExportButton items={items} />}
      renderPreview={(item) => (
        <PredictionRunDetails runId={String(item.id)} bookmarkName={item.bookmarkName} />
      )}
    />
  );
}
