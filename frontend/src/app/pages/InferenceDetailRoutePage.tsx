import { getRouteApi } from "@tanstack/react-router";
import { InferenceDetailPage } from "@/features/inferences/pages/inference-detail-page";
import { PredictionRunDetails } from "@/features/schemas/components/PredictionRunDetails";
import { useSearchUpdate } from "@/shared/lib/use-search-update";

const route = getRouteApi("/protected/app/can-view-models/inferences/$inferenceId");

/** The inference page, with its data from the schemas feature (features do not import each other). */
export function InferenceDetailRoutePage() {
  const search = route.useSearch();
  const updateSearch = useSearchUpdate<typeof search>();
  return (
    <InferenceDetailPage
      renderData={(inference, reviews) => (
        <PredictionRunDetails
          runId={String(inference.id)}
          bookmarkName={inference.bookmarkName}
          reviews={reviews}
          tab={search.tab}
          onTabChange={(tab) => updateSearch({ tab })}
        />
      )}
    />
  );
}
