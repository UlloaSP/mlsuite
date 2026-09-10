import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type InferenceReviewAssignmentDto,
  useInferenceReviewAssignments,
} from "@/features/inferences/api/inference-api";
import {
  useDeleteInferenceReviewResponseMutation,
  useReopenInferenceReviewMutation,
} from "@/features/inferences/api/inference-mutations";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { AppTextField } from "@/shared/ui/AppTextField";
import { CatalogPaginationFooter } from "@/shared/ui/catalog/CatalogPaginationFooter";
import { InferenceReviewTile } from "./InferenceReviewTile";

type Props = {
  inferenceId: number;
  inferenceName: string;
};

type StateFilter = "ALL" | InferenceReviewAssignmentDto["reviewState"];

const PAGE_SIZE = 6;

export function InferenceReviewStatusSection({ inferenceId, inferenceName }: Props) {
  const assignments = useInferenceReviewAssignments(inferenceId);
  const reopen = useReopenInferenceReviewMutation();
  const deleteResponse = useDeleteInferenceReviewResponseMutation();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<StateFilter>("ALL");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (assignments.data ?? []).filter(
      (assignment) =>
        (state === "ALL" || assignment.reviewState === state) &&
        (!normalized ||
          `${assignment.reviewer.fullName} ${assignment.reviewer.email}`
            .toLowerCase()
            .includes(normalized)),
    );
  }, [assignments.data, query, state]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(visiblePage * PAGE_SIZE, (visiblePage + 1) * PAGE_SIZE);
  const actionPending = reopen.isPending || deleteResponse.isPending;

  const handleReopen = async (assignment: InferenceReviewAssignmentDto) => {
    if (
      !window.confirm(
        `Reopen ${inferenceName} for ${assignment.reviewer.fullName}? Their saved answers will be kept.`,
      )
    ) {
      return;
    }
    try {
      await reopen.mutateAsync({
        inferenceId,
        reviewId: assignment.reviewId,
        reviewRunId: assignment.reviewRunId,
        reviewerId: assignment.reviewer.id,
      });
      toast.success("Review reopened", {
        description: `${assignment.reviewer.fullName} can edit and submit it again.`,
      });
    } catch (error) {
      toast.error("Could not reopen review", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleDelete = async (assignment: InferenceReviewAssignmentDto) => {
    if (
      !window.confirm(
        `Delete ${assignment.reviewer.fullName}'s saved response for ${inferenceName}? Their assignment will remain and return to Pending.`,
      )
    ) {
      return;
    }
    try {
      await deleteResponse.mutateAsync({
        inferenceId,
        reviewId: assignment.reviewId,
        reviewRunId: assignment.reviewRunId,
        reviewerId: assignment.reviewer.id,
      });
      toast.success("Review response deleted", {
        description: `${assignment.reviewer.fullName} can start this inference again.`,
      });
    } catch (error) {
      toast.error("Could not delete review response", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AppPanel id="reviews" className="overflow-hidden p-0">
      <header className="border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <AppSectionTitle>Reviews</AppSectionTitle>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              One tile per reviewer assignment. Reopen keeps answers; delete clears them.
            </p>
          </div>
          {assignments.data?.length ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {filtered.length} of {assignments.data.length}
            </p>
          ) : null}
        </div>
        {assignments.data?.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <AppTextField
              aria-label="Search reviewers"
              className="w-full py-2.5"
              placeholder="Search reviewer"
              prefix={<Search size={15} />}
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setPage(0);
              }}
            />
            <AppSelect
              aria-label="Review status"
              value={state}
              onValueChange={(value) => {
                setState(value as StateFilter);
                setPage(0);
              }}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "COMPLETED", label: "Completed" },
                { value: "IN_PROGRESS", label: "In progress" },
                { value: "PENDING", label: "Pending" },
              ]}
            />
          </div>
        ) : null}
      </header>
      <div className="p-5 sm:p-6">
        {assignments.isLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading reviews…</p>
        ) : assignments.error ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--danger-text)]">Review status unavailable.</p>
            <AppButton
              variant="secondary"
              className="px-3 py-2"
              onClick={() => void assignments.refetch()}
            >
              Try again
            </AppButton>
          </div>
        ) : visible.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((assignment) => (
                <InferenceReviewTile
                  key={`${assignment.reviewId}:${assignment.reviewRunId}:${assignment.reviewer.id}`}
                  assignment={assignment}
                  disabled={actionPending}
                  onReopen={() => void handleReopen(assignment)}
                  onDelete={() => void handleDelete(assignment)}
                />
              ))}
            </div>
            {totalPages > 1 ? (
              <CatalogPaginationFooter
                disabled={actionPending || assignments.isFetching}
                hasNext={visiblePage + 1 < totalPages}
                page={visiblePage}
                setPage={setPage}
                totalPages={totalPages}
              />
            ) : null}
          </>
        ) : assignments.data?.length ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No reviews match the current search and status.
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">No reviews include this inference.</p>
        )}
      </div>
    </AppPanel>
  );
}
