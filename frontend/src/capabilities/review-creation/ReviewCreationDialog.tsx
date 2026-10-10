import { useReviewRunSelection } from "./useReviewRunSelection";
import { ClipboardPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/shared/ui/AppButton";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppDialog } from "@/shared/ui/AppDialog";
import { ReviewSnapshotSelect } from "./ReviewSnapshotSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import { type ReviewCandidate, useCreateReviewMutation } from "./review-creation-api";
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
            <ReviewSnapshotSelect
              organizationId={organizationId}
              kind="snapshots"
              ids={candidates.map((item) => item.runId)}
              value={group?.key ?? ""}
              label={group?.label}
              onChange={selectGroup}
            />
          </AppFieldLabel>
          {bookmarkOptions.length > 0 ? (
            <AppFieldLabel label="Bookmark">
              <ReviewSnapshotSelect
                organizationId={organizationId}
                kind="bookmarks"
                ids={(group?.candidates ?? []).map((item) => item.runId)}
                value={bookmark}
                label={bookmarkOptions.find((option) => option.value === bookmark)?.label}
                onChange={selectBookmark}
              />
            </AppFieldLabel>
          ) : null}
        </div>
      ) : null}

      <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <ReviewSelectionCatalog
          organizationId={organizationId}
          key={`inferences:${group?.key ?? "none"}:${bookmark}`}
          title="Inferences"
          emptyDescription="No inferences are available for this schema snapshot."
          source={{ kind: "runs", ids: runCandidates.map((candidate) => candidate.runId) }}
          idFromString={String}
          selectedIds={selectedRunIds}
          onClear={() => setSelectedRunIds(new Set())}
          onSelectAll={(ids) => setSelectedRunIds((current) => new Set([...current, ...ids]))}
          onToggle={toggleRun}
        />
        <ReviewSelectionCatalog
          organizationId={organizationId}
          title="Reviewers"
          emptyDescription="Assign Review permission to an active organization member first."
          source={{ kind: "reviewers" }}
          idFromString={Number}
          selectedIds={selectedReviewerIds}
          onClear={() => setSelectedReviewerIds(new Set())}
          onSelectAll={(ids) => setSelectedReviewerIds((current) => new Set([...current, ...ids]))}
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
