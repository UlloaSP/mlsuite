import { toast } from "sonner";
import {
  useDeleteInferenceReviewResponseMutation,
  useReopenInferenceReviewMutation,
} from "@/features/inferences/api/inference-mutations";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { SchemaReviewAssignmentStatusDto } from "@/shared/api/openapi.gen";

/** What an assignment allows: reopening a submitted review, or clearing a saved response. */
export const assignmentActions = (assignment: SchemaReviewAssignmentStatusDto) => ({
  canReopen: assignment.reviewState === "COMPLETED" && !assignment.expired,
  canDelete: assignment.reviewState !== "PENDING",
});

/**
 * Reopen (answers kept) and delete (answers cleared, back to Pending) for one
 * inference's review assignments, each confirmed first. Render `dialog` once.
 */
export function useReviewAssignmentActions(inferenceId: number, inferenceName: string) {
  const reopen = useReopenInferenceReviewMutation();
  const deleteResponse = useDeleteInferenceReviewResponseMutation();
  const actionDialog = useActionDialog();
  const target = (assignment: SchemaReviewAssignmentStatusDto) => ({
    inferenceId,
    reviewId: assignment.reviewId,
    reviewRunId: assignment.reviewRunId,
    reviewerId: assignment.reviewer.id,
  });

  const handleReopen = async (assignment: SchemaReviewAssignmentStatusDto) => {
    const confirmed = await actionDialog.confirm({
      title: "Reopen review?",
      description: `Reopen ${inferenceName} for ${assignment.reviewer.fullName}. Their saved answers will be kept.`,
      confirmLabel: "Reopen",
    });
    if (!confirmed) return;
    try {
      await reopen.mutateAsync(target(assignment));
      toast.success("Review reopened", {
        description: `${assignment.reviewer.fullName} can edit and submit it again.`,
      });
    } catch (error) {
      toast.error("Could not reopen review", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleDelete = async (assignment: SchemaReviewAssignmentStatusDto) => {
    const confirmed = await actionDialog.confirm({
      title: "Delete saved response?",
      description: `Delete ${assignment.reviewer.fullName}'s saved response for ${inferenceName}. Their assignment will remain and return to Pending.`,
      confirmLabel: "Delete response",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deleteResponse.mutateAsync(target(assignment));
      toast.success("Review response deleted", {
        description: `${assignment.reviewer.fullName} can start this inference again.`,
      });
    } catch (error) {
      toast.error("Could not delete review response", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return {
    reopen: (assignment: SchemaReviewAssignmentStatusDto) => void handleReopen(assignment),
    remove: (assignment: SchemaReviewAssignmentStatusDto) => void handleDelete(assignment),
    pending: reopen.isPending || deleteResponse.isPending,
    dialog: actionDialog.dialog,
  };
}
