import { RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useInference } from "@/features/inferences/api/inference-api";
import { useReviewAssignment } from "@/features/inferences/api/inference-review-catalog";
import { ReviewAssignmentFacts } from "@/features/inferences/components/ReviewAssignmentFacts";
import { ReviewStateBadges } from "@/features/inferences/components/ReviewStateBadges";
import {
  assignmentActions,
  useReviewAssignmentActions,
} from "@/features/inferences/lib/use-review-assignment-actions";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { AppSurface } from "@/shared/ui/AppSurface";
import { appButtonClass } from "@/shared/ui/button-styles";
import { AppPageHeader } from "@/shared/ui/PageHeader";

type Props = {
  /** The reviewer's answers on this inference, owned by the schemas feature. */
  renderAnswers: (inferenceId: string, reviewerId: number) => ReactNode;
};

/** One reviewer's assignment on an inference: its state and dates, their answers, and its actions. */
export function InferenceReviewPage({ renderAnswers }: Props) {
  const {
    inferenceId = "",
    reviewRunId = "",
    reviewerId = "",
  } = useParams<{
    inferenceId: string;
    reviewRunId: string;
    reviewerId: string;
  }>();
  const inference = useInference(inferenceId).data;
  const assignments = useReviewAssignment(Number(inferenceId), reviewRunId, reviewerId);
  const assignment = assignments.data;
  const actions = useReviewAssignmentActions(
    Number(inferenceId),
    inference?.name ?? "this inference",
  );
  const reviewsHref = `/inferences/${inferenceId}?tab=reviews`;

  if (assignments.isLoading)
    return (
      <AppPage>
        <AppSurface className="flex-1">
          <AppLoadingState label="Loading review…" rows={3} />
        </AppSurface>
      </AppPage>
    );

  if (!assignment)
    return (
      <AppPage>
        <AppEmptyState
          title="Review unavailable"
          description="This assignment no longer includes the inference, or it could not be loaded."
          action={
            <Link to={reviewsHref} className={appButtonClass()}>
              Back to reviews
            </Link>
          }
        />
      </AppPage>
    );

  const { canReopen, canDelete } = assignmentActions(assignment);

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        {actions.dialog}
        <AppPageHeader
          title={assignment.reviewer.fullName}
          description={assignment.reviewer.email}
          breadcrumbs={[
            { label: "Inferences", to: "/inferences" },
            { label: inference?.name ?? "Inference", to: reviewsHref },
            { label: assignment.reviewer.fullName },
          ]}
          actions={
            <>
              {canReopen ? (
                <AppButton
                  variant="secondary"
                  disabled={actions.pending}
                  onClick={() => actions.reopen(assignment)}
                >
                  <RotateCcw size={16} />
                  Reopen
                </AppButton>
              ) : null}
              {canDelete ? (
                <AppButton
                  variant="danger"
                  disabled={actions.pending}
                  onClick={() => actions.remove(assignment)}
                >
                  <Trash2 size={16} />
                  Delete response
                </AppButton>
              ) : null}
            </>
          }
        />
        <AppPanel className="flex flex-col gap-4">
          <ReviewStateBadges assignment={assignment} />
          <ReviewAssignmentFacts assignment={assignment} inline />
        </AppPanel>
        <section aria-label="Answers" className="flex flex-col gap-4">
          <AppSectionTitle>Answers</AppSectionTitle>
          {renderAnswers(inferenceId, assignment.reviewer.id)}
        </section>
      </AppSurface>
    </AppPage>
  );
}
