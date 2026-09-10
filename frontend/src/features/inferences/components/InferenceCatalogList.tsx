import { type FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import { useNavigate } from "react-router";
import {
  formatTimestamp,
  getPredictionShortId,
} from "@/capabilities/prediction-runtime/data/model-utils";
import type { InferenceCatalogItemDto } from "@/features/inferences/api/inference-api";
import { PredictionStatusSummary } from "@/capabilities/prediction-runtime/feedback/PredictionStatusSummary";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { InferenceActionsMenu } from "./InferenceActionsMenu";

const inferenceHref = (item: InferenceCatalogItemDto) => `/inferences/${item.id}`;

type Props = {
  canDelete: boolean;
  canManageReviews: boolean;
  deletePending: boolean;
  items: InferenceCatalogItemDto[];
  feedbackStatuses?: Map<string, FeedbackStatusDisplay>;
  onDelete: (item: InferenceCatalogItemDto) => void;
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
      description={`${item.schemaName} · ${item.schemaVersionName} · v${item.schemaVersion}`}
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
      onOpen={() => navigate(inferenceHref(item))}
      actions={
        canDelete || canManageReviews ? (
          <InferenceActionsMenu
            canDelete={canDelete}
            canManageReviews={canManageReviews}
            disabled={deletePending}
            inferenceName={item.name}
            onDelete={() => onDelete(item)}
            onReviewStatus={() => navigate(`${inferenceHref(item)}?section=reviews`)}
          />
        ) : undefined
      }
    />
  ));
}
