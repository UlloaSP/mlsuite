import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { toExecutableSchemaVersion } from "@/capabilities/prediction-runtime/mlform/executable-schema";
import { useSubmitSchemaReviewInboxMutation } from "@/features/reviews/api/review-mutations";
import {
  reviewInboxItemQueryKey,
  useReviewInboxCatalog,
  useReviewInboxItem,
  useReviewCatalogContext,
  useReviewFirstRun,
} from "@/features/reviews/api/review-catalog";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { SCHEMA_REVIEW_INBOX_QUERY_KEY } from "@/features/reviews/api/review-keys";
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
// A run or review the inbox no longer lists (completed, closed, revoked) is not a failure:
// the inbox moves on to the next item.
const gone = (error: unknown) => error instanceof HttpError && error.status === 404;

export function ReviewsPage() {
  const { reviewId, reviewRunId } = useParams<{ reviewId?: string; reviewRunId?: string }>();
  const navigate = useNavigate();
  const inbox = useReviewInboxCatalog();
  const requested = useReviewInboxItem(reviewId, reviewRunId);
  const first = useReviewFirstRun(reviewId, Boolean(reviewId && !reviewRunId));
  const failure = [inbox.error, requested.error, first.error].find(
    (error) => error && !gone(error),
  );
  const selected: ReviewRailItem | undefined = reviewRunId
    ? requested.data
    : reviewId
      ? first.data?.items[0]
        ? { ...first.data.items[0], reviewId, schemaName: "" }
        : undefined
      : inbox.data?.items[0];
  const context = useReviewCatalogContext(selected?.reviewId);
  const selectedReview = context.data;
  const resolving = inbox.isLoading || requested.isLoading || first.isLoading;
  // The URL names something the inbox no longer has; the effect below is about to leave it.
  const leaving = !resolving && !selected && Boolean(reviewId ?? reviewRunId);
  const showLoader = useStableLoading(resolving || leaving);
  const submitMutation = useSubmitSchemaReviewInboxMutation();
  const qc = useQueryClient();
  const org = useCurrentOrganizationId() ?? "none";
  const selectedVersion = useMemo(
    () => (selectedReview ? toExecutableSchemaVersion(selectedReview.schemaVersion) : undefined),
    [selectedReview],
  );
  const open = useCallback(
    (item: ReviewRailItem, replace = false) => {
      // The tray already holds the item, so opening it never waits for a request.
      qc.setQueryData(reviewInboxItemQueryKey(org, item.reviewId, item.publicId), item);
      void navigate(`/review/${item.reviewId}/runs/${item.publicId}`, {
        replace,
        viewTransition: false,
      });
    },
    [navigate, org, qc],
  );

  useEffect(() => {
    if (resolving || failure) return;
    if (!selected) {
      if (reviewId || reviewRunId)
        void navigate("/review", { replace: true, viewTransition: false });
      return;
    }
    if (selected.reviewId === reviewId && selected.publicId === reviewRunId) return;
    open(selected, true);
  }, [resolving, failure, navigate, open, reviewId, reviewRunId, selected]);

  if (inbox.error instanceof HttpError && inbox.error.status === 403) {
    return <ReviewUnavailable title="Access denied" description="Your role cannot review." />;
  }
  if (failure || context.error) return <ReviewUnavailable />;

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
        ) : !selected ? (
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
                {selectedReview ? (
                  <SchemaReviewRunDetailPanel
                    reviewId={selected.reviewId}
                    reviewRunId={selected.publicId}
                    version={selectedVersion ?? selectedReview.schemaVersion}
                    onReviewChanged={() =>
                      qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_INBOX_QUERY_KEY(org) })
                    }
                  />
                ) : (
                  // The tray stays in place while another review's snapshot loads.
                  <AppLoadingState label="Loading review…" rows={3} />
                )}
              </div>
            </section>
            {submitMutation.error ? <p role="alert">{submitMutation.error.message}</p> : null}
            <SchemaReviewRunRail
              revisionCount={inbox.data?.revisionCount ?? 0}
              pendingCount={inbox.data?.pendingCount ?? 0}
              selectedReviewRunId={selected.publicId}
              onSelect={open}
              submitting={submitMutation.isPending}
              onSubmitRevision={() =>
                submitMutation.mutate(undefined, {
                  onSuccess: () => navigate("/review", { replace: true, viewTransition: false }),
                })
              }
            />
          </div>
        )}
      </AppSurface>
    </AppPage>
  );
}
