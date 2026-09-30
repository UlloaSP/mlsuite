import { useReviewRunSelection } from "./useReviewRunSelection";
import { ClipboardPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppButton } from "@/shared/ui/AppButton";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import {
  type ReviewCandidate,
  useCreateReviewMutation,
  useEligibleReviewers,
} from "./review-creation-api";
import { ReviewSelectionCatalog } from "./ReviewSelectionCatalog";

type Props = {
  candidates: ReviewCandidate[];
  organizationId: number | string;
  onClose: () => void;
};

const defaultExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

export function ReviewCreationDialog({ candidates, organizationId, onClose }: Props) {
  const {
    groups,
    group,
    bookmark,
    bookmarkOptions,
    runCandidates,
    selectedRunIds,
    setSelectedRunIds,
    selectGroup,
    selectBookmark,
  } = useReviewRunSelection(candidates);
  const [expiresAt, setExpiresAt] = useState(defaultExpiryDate);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<number>>(new Set());
  const reviewers = useEligibleReviewers(organizationId);
  const createReview = useCreateReviewMutation(organizationId);

  const [error, setError] = useState<string>();
  const create = async () => {
    setError(undefined);
    if (!group || !selectedRunIds.size || !selectedReviewerIds.size) {
      setError("Select at least one inference and one reviewer.");
      return;
    }
    const schemaId = Number(group.schemaId);
    const versionId = Number(group.versionId);
    const runIds = [...selectedRunIds].map(Number);
    if (![schemaId, versionId, ...runIds].every(Number.isSafeInteger)) {
      setError("The selection contains an invalid identifier.");
      return;
    }
    try {
      await createReview.mutateAsync({
        schemaId,
        versionId,
        runIds,
        reviewerIds: [...selectedReviewerIds],
        expiresAt: new Date(`${expiresAt}T23:59:59.000Z`).toISOString(),
      });
      toast.success("Review created");
      onClose();
    } catch (creationError) {
      setError(
        `Review creation failed: ${creationError instanceof Error ? creationError.message : String(creationError)}`,
      );
    }
  };

  const toggleRun = useCallback(
    (runId: string) => {
      setSelectedRunIds((current) => toggleSetValue(current, runId));
    },
    [setSelectedRunIds],
  );
  const toggleReviewer = useCallback((reviewerId: number) => {
    setSelectedReviewerIds((current) => toggleSetValue(current, reviewerId));
  }, []);

  return (
    <AppDialog
      open
      size="xl"
      flush
      error={error}
      onClose={onClose}
      title="Create review"
      description="Choose the inferences and organization members responsible for reviewing them."
      footer={
        <>
          <div className="mr-auto">
            <AppFieldLabel label="Review expires">
              <AppTextField
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.currentTarget.value)}
                className="w-48"
              />
            </AppFieldLabel>
          </div>
          <div className="flex items-end gap-3">
            <AppButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton
              type="button"
              disabled={!selectedRunIds.size || !selectedReviewerIds.size || createReview.isPending}
              onClick={() => void create()}
            >
              <ClipboardPlus size={16} /> Assign review
            </AppButton>
          </div>
        </>
      }
    >
      {groups.length > 1 || bookmarkOptions.length > 0 ? (
        <div className="grid gap-4 border-b border-line px-6 py-4 sm:grid-cols-2">
          <AppFieldLabel label="Schema snapshot">
            <AppSelect
              aria-label="Schema snapshot"
              value={group?.key}
              onValueChange={selectGroup}
              className="w-full min-w-0"
              options={groups.map((item) => ({ value: item.key, label: item.label }))}
            />
          </AppFieldLabel>
          {bookmarkOptions.length > 0 ? (
            <AppFieldLabel label="Bookmark">
              <AppSelect
                aria-label="Bookmark"
                value={bookmark}
                onValueChange={selectBookmark}
                className="w-full min-w-0"
                options={[{ value: "all", label: "All bookmarks" }, ...bookmarkOptions]}
              />
            </AppFieldLabel>
          ) : null}
        </div>
      ) : null}

      <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <ReviewSelectionCatalog
          key={`inferences:${group?.key ?? "none"}:${bookmark}`}
          title="Inferences"
          emptyDescription="No inferences are available for this schema snapshot."
          items={runCandidates.map((candidate) => ({
            id: candidate.runId,
            title: candidate.name,
            detail: formatTimestamp(candidate.createdAt),
          }))}
          selectedIds={selectedRunIds}
          onClear={() => setSelectedRunIds(new Set())}
          onSelectAll={(ids) => setSelectedRunIds((current) => new Set([...current, ...ids]))}
          onToggle={toggleRun}
        />
        <ReviewSelectionCatalog
          title="Reviewers"
          emptyDescription="Assign Review permission to an active organization member first."
          loading={reviewers.isLoading}
          error={Boolean(reviewers.error)}
          items={(reviewers.data ?? []).map((reviewer) => ({
            id: reviewer.id,
            title: reviewer.fullName,
            detail: reviewer.email,
          }))}
          selectedIds={selectedReviewerIds}
          onClear={() => setSelectedReviewerIds(new Set())}
          onSelectAll={(ids) => setSelectedReviewerIds((current) => new Set([...current, ...ids]))}
          onRetry={() => void reviewers.refetch()}
          onToggle={toggleReviewer}
        />
      </div>
    </AppDialog>
  );
}

function toggleSetValue<T>(current: Set<T>, value: T) {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
