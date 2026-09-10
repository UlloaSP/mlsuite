import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import { useSubmitSchemaReviewInboxMutation } from "@/features/reviews/api/review-mutations";
import { useSchemaReviewInbox } from "@/features/reviews/api/review-queries";
import type { SchemaReviewContextDto } from "@/features/reviews/api/review-types";
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
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";

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
    () =>
      selectedReview ? prepareSchemaVersionDtoForUse(selectedReview.schemaVersion) : undefined,
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

  if (inbox.isLoading) {
    return (
      <AppPage>
        <AppSurface className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--text-secondary)]">Loading review inbox</p>
        </AppSurface>
      </AppPage>
    );
  }
  if (inbox.error instanceof HttpError && inbox.error.status === 403) {
    return <ReviewUnavailable title="Access denied" description="Your role cannot review." />;
  }
  if (inbox.error) return <ReviewUnavailable />;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-auto">
        <AppPageHeader
          eyebrow="Review"
          title="Review inbox"
          description="Review the inferences assigned to you across every schema."
        />
        {!selected || !selectedReview ? (
          <AppEmptyState
            title="Inbox clear"
            description="There are no pending inferences assigned to you."
          />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)_360px]">
            <ReviewStepContextPanel />
            <section className="min-w-0">
              <SchemaReviewRunDetailPanel
                reviewId={selected.reviewId}
                reviewRunId={selected.publicId}
                version={selectedVersion ?? selectedReview.schemaVersion}
                onReviewChanged={() => inbox.refetch()}
              />
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
