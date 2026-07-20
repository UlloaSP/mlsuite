import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { HttpError } from "@/shared/api/http";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { ReviewShell } from "@/features/reviews/components/ReviewShell";
import { ReviewStepContextPanel } from "@/features/reviews/components/ReviewStepContextPanel";
import { ReviewUnavailable } from "@/features/reviews/components/ReviewUnavailable";
import { useSubmitSchemaReviewRunsMutation } from "@/features/reviews/api/review-mutations";
import { useSchemaReviewContext } from "@/features/reviews/api/review-queries";
import { firstReviewRunToken, hasReviewRunToken } from "@/features/reviews/lib/run-selection";
import { SchemaReviewRunDetailPanel } from "@/features/reviews/components/SchemaReviewRunDetailPanel";
import { SchemaReviewRunRail } from "@/features/reviews/components/SchemaReviewRunRail";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/mlform/binding-rebase";

export function SchemaReviewWorkspacePage() {
  const { token = "", runToken } = useParams<{ token: string; runToken?: string }>();
  const navigate = useNavigate();
  const reviewContext = useSchemaReviewContext(token);
  const { data, error, isLoading } = reviewContext;
  const submitMutation = useSubmitSchemaReviewRunsMutation(token);
  const selectedRunToken = useMemo(
    () => runToken ?? (data ? firstReviewRunToken(data.runs) : undefined),
    [data, runToken],
  );
  const executableVersion = useMemo(
    () => (data ? prepareSchemaVersionDtoForUse(data.schemaVersion) : undefined),
    [data],
  );

  useEffect(() => {
    if (!token || runToken || !selectedRunToken) return;
    navigate(`/review/${token}/runs/${selectedRunToken}`, {
      replace: true,
      viewTransition: false,
    });
  }, [navigate, runToken, selectedRunToken, token]);

  useEffect(() => {
    if (!token || !runToken || !data || hasReviewRunToken(data.runs, runToken)) return;
    const nextToken = firstReviewRunToken(data.runs);
    navigate(nextToken ? `/review/${token}/runs/${nextToken}` : `/review/${token}`, {
      replace: true,
      viewTransition: false,
    });
  }, [data, navigate, runToken, token]);

  if (isLoading)
    return (
      <ReviewShell>
        <p className="text-sm text-[var(--text-secondary)]">Loading review</p>
      </ReviewShell>
    );
  if (error instanceof HttpError && error.status === 403) {
    return (
      <ReviewUnavailable
        title="Access denied"
        description="Your account is not allowed to open this review link."
      />
    );
  }
  if (error || !data) return <ReviewUnavailable />;

  return (
    <ReviewShell title={data.schema.name}>
      {data.runs.length === 0 ? (
        <AppEmptyState
          title="No inferences available"
          description="No selected inferences are available for review."
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)_360px]">
          <ReviewStepContextPanel />
          <section className="min-w-0">
            {selectedRunToken ? (
              <SchemaReviewRunDetailPanel
                token={token}
                runToken={selectedRunToken}
                version={executableVersion ?? data.schemaVersion}
                onReviewChanged={() => reviewContext.refetch()}
              />
            ) : null}
          </section>
          <SchemaReviewRunRail
            items={data.runs}
            selectedRunToken={selectedRunToken}
            onSelect={(selected) =>
              navigate(`/review/${token}/runs/${selected}`, { viewTransition: false })
            }
            submitting={submitMutation.isPending}
            onSubmitRevision={(selectedTokens) => submitMutation.mutate(selectedTokens)}
          />
        </div>
      )}
    </ReviewShell>
  );
}
