import { ClipboardPlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppButton } from "@/shared/ui/AppButton";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import {
  groupReviewCandidates,
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const groups = useMemo(() => groupReviewCandidates(candidates), [candidates]);
  const [groupKey, setGroupKey] = useState(groups[0]?.key ?? "");
  const group = groups.find((item) => item.key === groupKey) ?? groups[0];
  const [expiresAt, setExpiresAt] = useState(defaultExpiryDate);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(
    () => new Set(group?.candidates.map((item) => item.runId)),
  );
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<number>>(new Set());
  const reviewers = useEligibleReviewers(organizationId);
  const createReview = useCreateReviewMutation(organizationId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const selectGroup = (key: string) => {
    const next = groups.find((item) => item.key === key);
    setGroupKey(key);
    setSelectedRunIds(new Set(next?.candidates.map((item) => item.runId)));
  };

  const create = async () => {
    if (!group || !selectedRunIds.size || !selectedReviewerIds.size) {
      toast.error("Select at least one inference and one reviewer");
      return;
    }
    const schemaId = Number(group.schemaId);
    const versionId = Number(group.versionId);
    const runIds = [...selectedRunIds].map(Number);
    if (![schemaId, versionId, ...runIds].every(Number.isSafeInteger)) {
      toast.error("Review selection contains an invalid identifier");
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
    } catch (error) {
      toast.error("Review creation failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const toggleRun = useCallback((runId: string) => {
    setSelectedRunIds((current) => toggleSetValue(current, runId));
  }, []);
  const toggleReviewer = useCallback((reviewerId: number) => {
    setSelectedReviewerIds((current) => toggleSetValue(current, reviewerId));
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-review-title"
      onCancel={onClose}
      className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-4 text-inherit backdrop:bg-black/45 sm:p-6"
    >
      <div className="flex max-h-[min(860px,calc(100dvh-2rem))] w-[min(1024px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-hover)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <h2 id="create-review-title" className="text-xl font-semibold">
              Create review
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Choose the inferences and organization members responsible for reviewing them.
            </p>
          </div>
          <AppIconButton type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </AppIconButton>
        </header>

        {groups.length > 1 ? (
          <div className="border-b border-[var(--border-soft)] px-6 py-4">
            <AppFieldLabel label="Schema snapshot">
              <AppSelect
                aria-label="Schema snapshot"
                value={group?.key}
                onValueChange={selectGroup}
                className="min-w-64"
                options={groups.map((item) => ({ value: item.key, label: item.label }))}
              />
            </AppFieldLabel>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 divide-y divide-[var(--border-soft)] overflow-auto lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <ReviewSelectionCatalog
            key={`inferences:${group?.key ?? "none"}`}
            title="Inferences"
            emptyDescription="No inferences are available for this schema snapshot."
            items={(group?.candidates ?? []).map((candidate) => ({
              id: candidate.runId,
              title: candidate.name,
              detail: formatTimestamp(candidate.createdAt),
            }))}
            selectedIds={selectedRunIds}
            onClear={() => setSelectedRunIds(new Set())}
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
            onRetry={() => void reviewers.refetch()}
            onToggle={toggleReviewer}
          />
        </div>

        <footer className="flex flex-col gap-4 border-t border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
          <AppFieldLabel label="Review expires">
            <AppTextField
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.currentTarget.value)}
              className="w-48"
            />
          </AppFieldLabel>
          <div className="flex justify-end gap-3">
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
        </footer>
      </div>
    </dialog>
  );
}

function toggleSetValue<T>(current: Set<T>, value: T) {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
