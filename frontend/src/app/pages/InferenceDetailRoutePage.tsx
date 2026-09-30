import { InferenceDetailPage } from "@/features/inferences/pages/inference-detail-page";
import { PredictionRunDetails } from "@/features/schemas/components/PredictionRunDetails";

/** The inference page, with its data from the schemas feature (features do not import each other). */
export function InferenceDetailRoutePage() {
  return (
    <InferenceDetailPage
      renderData={(inference, reviews) => (
        <PredictionRunDetails
          runId={String(inference.id)}
          bookmarkName={inference.bookmarkName}
          reviews={reviews}
        />
      )}
    />
  );
}
