import { type FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import { useNavigate } from "react-router";
import { getPredictionShortId } from "@/capabilities/prediction-runtime/data/model-utils";
import { formatTimestamp } from "@/shared/lib/date-time";
import { PredictionStatusSummary } from "@/capabilities/prediction-runtime/feedback/PredictionStatusSummary";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { InferenceActionsMenu } from "./InferenceActionsMenu";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

const inferenceHref = (item: PredictionRunCatalogItemDto) => `/inferences/${item.id}`;

type Props = {
  canDelete: boolean;
  canManageReviews: boolean;
  deletePending: boolean;
  items: PredictionRunCatalogItemDto[];
  feedbackStatuses?: Map<string, FeedbackStatusDisplay>;
  onDelete: (item: PredictionRunCatalogItemDto) => void;
};

export function InferenceCatalogList({
  canDelete,
  canManageReviews,
  deletePending,
  items,
  onDelete,
  feedbackStatuses,
}: Props) {
  const navigate = useNavigate();
  return items.map((item) => (
    <CatalogEntry
      key={item.id}
      title={item.name}
      description={`${item.schemaName} · ${snapshotLabel(item.schemaVersionName, item.schemaVersion)}`}
      metadata={
        <>
          <span>#{getPredictionShortId(String(item.id))}</span>
          <span>By {item.createdByName || item.createdByEmail || "Unknown author"}</span>
          <span>Bookmark: {item.bookmarkName ?? "None"}</span>
          <span>Updated {formatTimestamp(item.updatedAt ?? item.createdAt)}</span>
        </>
      }
      details={
        <PredictionStatusSummary
          status={item.status}
          feedback={feedbackStatuses?.get(String(item.id))}
        />
      }
      to={inferenceHref(item)}
      actions={
        canDelete || canManageReviews ? (
          <InferenceActionsMenu
            canDelete={canDelete}
            canManageReviews={canManageReviews}
            disabled={deletePending}
            inferenceName={item.name}
            onDelete={() => onDelete(item)}
            onReviewStatus={() => navigate(`${inferenceHref(item)}?tab=reviews&section=reviews`)}
          />
        ) : undefined
      }
    />
  ));
}
