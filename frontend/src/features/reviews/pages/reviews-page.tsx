import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { toExecutableSchemaVersion } from "@/capabilities/prediction-runtime/mlform/executable-schema";
import { useSubmitSchemaReviewInboxMutation } from "@/features/reviews/api/review-mutations";
import { useSchemaReviewInbox } from "@/features/reviews/api/review-queries";
import { ReviewStepContextPanel } from "@/features/reviews/components/ReviewStepContextPanel";
import { ReviewUnavailable } from "@/features/reviews/components/ReviewUnavailable";
import { SchemaReviewRunDetailPanel } from "@/features/reviews/components/SchemaReviewRunDetailPanel";
import {
  SchemaReviewRunRail,
  type ReviewRailItem,
} from "@/features/reviews/components/SchemaReviewRunRail";
import { HttpError } from "@/shared/api/http";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import type { SchemaReviewContextDto } from "@/shared/api/openapi.gen";

const inboxItems = (reviews: SchemaReviewContextDto[]): ReviewRailItem[] =>
  reviews.flatMap((review) =>
    review.runs.flatMap((item) =>
      item.reviewState === "COMPLETED"
        ? []
        : [{ ...item, reviewId: review.publicId, schemaName: review.schema.name }],
    ),
  );

const submissionsFor = (items: ReviewRailItem[]) => {
  const grouped = new Map<string, string[]>();
  for (const item of items) {
    grouped.set(item.reviewId, [...(grouped.get(item.reviewId) ?? []), item.publicId]);
  }
  return [...grouped].map(([reviewId, reviewRunIds]) => ({ reviewId, reviewRunIds }));
};

export function ReviewsPage() {
  const { reviewId, reviewRunId } = useParams<{ reviewId?: string; reviewRunId?: string }>();
  const navigate = useNavigate();
  const inbox = useSchemaReviewInbox();
  const showLoader = useStableLoading(inbox.isLoading);
  const submitMutation = useSubmitSchemaReviewInboxMutation();
  const items = useMemo(() => inboxItems(inbox.data ?? []), [inbox.data]);
  const selected = useMemo(
    () =>
      items.find(
        (item) => item.reviewId === reviewId && (!reviewRunId || item.publicId === reviewRunId),
      ) ?? items[0],
    [items, reviewId, reviewRunId],
  );
  const selectedReview = inbox.data?.find((review) => review.publicId === selected?.reviewId);
  const selectedVersion = useMemo(
    () => (selectedReview ? toExecutableSchemaVersion(selectedReview.schemaVersion) : undefined),
    [selectedReview],
  );

  useEffect(() => {
    if (inbox.isLoading) return;
    if (!selected) {
      if (reviewId || reviewRunId) navigate("/review", { replace: true, viewTransition: false });
      return;
    }
    if (selected.reviewId === reviewId && selected.publicId === reviewRunId) return;
    navigate(`/review/${selected.reviewId}/runs/${selected.publicId}`, {
      replace: true,
      viewTransition: false,
    });
  }, [inbox.isLoading, navigate, reviewId, reviewRunId, selected]);

  if (inbox.error instanceof HttpError && inbox.error.status === 403) {
    return <ReviewUnavailable title="Access denied" description="Your role cannot review." />;
  }
  if (inbox.error) return <ReviewUnavailable />;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto xl:overflow-hidden">
        <AppPageHeader
          eyebrow="Review"
          title="Review inbox"
          description="Review the inferences assigned to you across every schema."
        />
        {showLoader ? (
          <AppLoadingState label="Loading review inbox…" rows={3} />
        ) : !selected || !selectedReview ? (
          <AppEmptyState
            title="Inbox clear"
            description="There are no pending inferences assigned to you."
          />
        ) : (
          // From xl the review and the tray sit side by side and fill the page height;
          // the review scrolls on its own so the tray stays in view. The step context
          // takes a third column only on 2xl screens and only while a step is selected.
          <div className="grid gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[minmax(0,1fr)]">
            <section className="flex min-w-0 flex-col gap-6 xl:overflow-y-auto 2xl:flex-row 2xl:items-start">
              <ReviewStepContextPanel />
              <div className="min-w-0 flex-1">
                <SchemaReviewRunDetailPanel
                  reviewId={selected.reviewId}
                  reviewRunId={selected.publicId}
                  version={selectedVersion ?? selectedReview.schemaVersion}
                  onReviewChanged={() => inbox.refetch()}
                />
              </div>
            </section>
            <SchemaReviewRunRail
              items={items}
              selectedReviewRunId={selected.publicId}
              onSelect={(item) =>
                navigate(`/review/${item.reviewId}/runs/${item.publicId}`, {
                  viewTransition: false,
                })
              }
              submitting={submitMutation.isPending}
              onSubmitRevision={(revision) => submitMutation.mutate(submissionsFor(revision))}
            />
          </div>
        )}
      </AppSurface>
    </AppPage>
  );
}
