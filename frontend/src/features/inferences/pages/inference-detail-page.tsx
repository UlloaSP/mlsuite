import { useReviewAssignmentCounts } from "@/features/inferences/api/inference-review-catalog";
import { RotateCcw } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useInference } from "@/features/inferences/api/inference-api";
import { InferenceReviewStatusSection } from "@/features/inferences/components/InferenceReviewStatusSection";
import { appButtonClass } from "@/shared/ui/button-styles";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

type Props = {
  /**
   * The inference's data (inputs, outputs, feedback), owned by the schemas feature.
   * `reviews` is this page's review management and its completed/total count,
   * shown as the data's Reviews tab (null when the member cannot manage reviews).
   */
  renderData: (
    inference: PredictionRunCatalogItemDto,
    reviews: { content: ReactNode; count?: string } | null,
  ) => ReactNode;
};

/** One inference: what produced it, its data and feedback, and the reviews it is part of. */
export function InferenceDetailPage({ renderData }: Props) {
  const { inferenceId = "" } = useParams<{ inferenceId: string }>();
  const [searchParams] = useSearchParams();
  const inference = useInference(inferenceId);
  const showLoader = useStableLoading(inference.isLoading);
  const { data: workspace } = useWorkspaceContext();
  const item = inference.data;
  const permissions = workspace?.permissions;
  const reviewRequested = searchParams.get("section") === "reviews";
  const canManageReviews = permissions?.canManageReviews ?? false;
  // Only fetched for managers.
  const assignments = useReviewAssignmentCounts(Number(inferenceId), canManageReviews).data;
  const reviewCount = assignments ? `${assignments.completed}/${assignments.total}` : undefined;

  useEffect(() => {
    if (reviewRequested && item) document.getElementById("reviews")?.scrollIntoView();
  }, [item, reviewRequested]);

  if (showLoader) {
    return <AppPageLoader label="Loading inference…" />;
  }

  if (!item) {
    return (
      <AppPage>
        <AppSurface className="flex-1">
          <AppEmptyState
            title="Inference unavailable"
            description="It may have been deleted or belong to another organization."
            action={
              <Link to="/inferences" className={appButtonClass()}>
                Back to inferences
              </Link>
            }
          />
        </AppSurface>
      </AppPage>
    );
  }

  const reviews = canManageReviews
    ? {
        content: <InferenceReviewStatusSection inferenceId={item.id} inferenceName={item.name} />,
        count: reviewCount,
      }
    : reviewRequested
      ? {
          content: (
            <AppEmptyState
              title="Review management unavailable"
              description="You do not have permission to manage reviews in this organization."
            />
          ),
        }
      : null;

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title={item.name}
          description={`${item.schemaName} · ${snapshotLabel(item.schemaVersionName, item.schemaVersion)}`}
          breadcrumbs={[{ label: "Inferences", to: "/inferences" }, { label: item.name }]}
          actions={
            item.bookmarkId != null && permissions?.canRunPredictions ? (
              <Link to={`/predict/${item.bookmarkId}?from=${item.id}`} className={appButtonClass()}>
                <RotateCcw size={16} />
                Predict again
              </Link>
            ) : null
          }
        />
        {renderData(item, reviews)}
      </AppSurface>
    </AppPage>
  );
}
