import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { HttpError } from "../../app/api/appFetch";
import { AppEmptyState } from "../../app/components/ui";
import { ReviewShell } from "../../review/components/ReviewShell";
import { ReviewStepContextPanel } from "../../review/components/ReviewStepContextPanel";
import { ReviewUnavailable } from "../../review/components/ReviewUnavailable";
import {
  useSchemaReviewContext,
  useSubmitSchemaReviewRunsMutation,
} from "../hooks";
import {
  firstReviewRunToken,
  hasReviewRunToken,
} from "../reviewRunSelection";
import { SchemaReviewRunDetailPanel } from "../components/SchemaReviewRunDetailPanel";
import { SchemaReviewRunRail } from "../components/SchemaReviewRunRail";
import { prepareSchemaVersionDtoForUse } from "../../schemas/schema-binding-rebase";

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
    navigate(`/schema-review/${token}/runs/${selectedRunToken}`, { replace: true, viewTransition: false });
  }, [navigate, runToken, selectedRunToken, token]);

  useEffect(() => {
    if (!token || !runToken || !data || hasReviewRunToken(data.runs, runToken)) return;
    const nextToken = firstReviewRunToken(data.runs);
    navigate(nextToken ? `/schema-review/${token}/runs/${nextToken}` : `/schema-review/${token}`, {
      replace: true,
      viewTransition: false,
    });
  }, [data, navigate, runToken, token]);

  if (isLoading) return <ReviewShell><p className="text-sm text-[var(--text-secondary)]">Loading review</p></ReviewShell>;
  if (error instanceof HttpError && error.status === 403) {
    return <ReviewUnavailable title="Access denied" description="Your account is not allowed to open this review link." />;
  }
  if (error || !data) return <ReviewUnavailable />;

  return (
    <ReviewShell title={data.schema.name}>
      {data.runs.length === 0 ? (
        <AppEmptyState title="No inferences available" description="No selected inferences are available for review." />
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
            onSelect={(selected) => navigate(`/schema-review/${token}/runs/${selected}`, { viewTransition: false })}
            submitting={submitMutation.isPending}
            onSubmitRevision={(selectedTokens) => submitMutation.mutate(selectedTokens)}
          />
        </div>
      )}
    </ReviewShell>
  );
}
