import { InferenceFeedbackStatuses } from "@/features/schemas/components/InferenceFeedbackStatuses";
import { InferencesPage } from "@/features/inferences/pages/inferences-page";
import { OrganizationInferenceExportButton } from "@/features/schemas/components/OrganizationInferenceExportButton";

export function InferencesRoutePage() {
  return (
    <InferencesPage
      renderFeedbackStatuses={(items, children) => (
        <InferenceFeedbackStatuses items={items}>{children}</InferenceFeedbackStatuses>
      )}
      renderExportAction={(items) => <OrganizationInferenceExportButton items={items} />}
    />
  );
}
