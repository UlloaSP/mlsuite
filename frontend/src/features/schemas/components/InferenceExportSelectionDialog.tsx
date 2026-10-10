import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useMemo } from "react";
import { useReviewRunSelection } from "@/capabilities/review-creation/useReviewRunSelection";
import { ReviewSelectionCatalog } from "@/capabilities/review-creation/ReviewSelectionCatalog";
import { AppButton } from "@/shared/ui/AppButton";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppDialog } from "@/shared/ui/AppDialog";
import { ReviewSnapshotSelect } from "@/capabilities/review-creation/ReviewSnapshotSelect";
import type { InferenceExportCandidate } from "./OrganizationInferenceExportButton";
import { toggledInSet } from "./schema-run-export-selection";
import { snapshotLabel } from "@/shared/lib/snapshot-label";

export type ExportRunSelection = { versionId: string; runIds: string[] };

export function InferenceExportSelectionDialog({
  items,
  busy,
  error,
  onClose,
  onContinue,
  onRetry,
}: {
  items: InferenceExportCandidate[];
  busy: boolean;
  error: boolean;
  onClose: () => void;
  onContinue: (selection: ExportRunSelection) => void;
  onRetry: () => void;
}) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const candidates = useMemo(
    () =>
      items.map((item) => ({
        runId: String(item.id),
        name: item.name,
        createdAt: item.createdAt,
        schemaId: String(item.schemaId),
        versionId: String(item.schemaVersionId),
        groupLabel: `${item.schemaName} · ${snapshotLabel(item.schemaVersionName, item.schemaVersion)}`,
        bookmarkId: item.bookmarkId == null ? null : String(item.bookmarkId),
        bookmarkName: item.bookmarkName,
      })),
    [items],
  );
  const selection = useReviewRunSelection(candidates);
  return (
    <AppDialog
      open
      size="xl"
      flush
      busy={busy}
      onClose={onClose}
      title="Export to CSV"
      description="Choose inferences, then review the feedback to include before downloading."
      footer={
        <>
          {error ? (
            <div className="mr-auto flex items-center gap-3">
              <p role="alert" className="text-sm">
                Could not prepare inference export.
              </p>
              <AppButton variant="secondary" onClick={onRetry}>
                Retry
              </AppButton>
            </div>
          ) : null}
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            disabled={busy || !selection.group || !selection.selectedRunIds.size}
            onClick={() => {
              if (selection.group)
                onContinue({
                  versionId: selection.group.versionId,
                  runIds: [...selection.selectedRunIds],
                });
            }}
          >
            {busy ? "Preparing export…" : "Continue"}
          </AppButton>
        </>
      }
    >
      <fieldset disabled={busy}>
        <div className="grid shrink-0 gap-4 border-b border-line px-6 py-4 sm:grid-cols-2">
          <AppFieldLabel label="Schema snapshot">
            <ReviewSnapshotSelect
              organizationId={organizationId}
              kind="snapshots"
              ids={candidates.map((item) => item.runId)}
              value={selection.group?.key ?? ""}
              label={selection.group?.label}
              disabled={busy}
              onChange={selection.selectGroup}
            />
          </AppFieldLabel>
          <AppFieldLabel label="Bookmark">
            <ReviewSnapshotSelect
              organizationId={organizationId}
              kind="bookmarks"
              ids={(selection.group?.candidates ?? []).map((item) => item.runId)}
              value={selection.bookmark}
              label={
                selection.bookmarkOptions.find((option) => option.value === selection.bookmark)
                  ?.label
              }
              disabled={busy}
              onChange={selection.selectBookmark}
            />
          </AppFieldLabel>
        </div>
        <div>
          <ReviewSelectionCatalog
            organizationId={organizationId}
            key={`${selection.group?.key}:${selection.bookmark}`}
            title="Inferences"
            emptyDescription="No inferences are available for this selection."
            source={{ kind: "runs", ids: selection.runCandidates.map((item) => item.runId) }}
            idFromString={String}
            selectedIds={selection.selectedRunIds}
            onClear={() => selection.setSelectedRunIds(new Set())}
            onSelectAll={(ids) => selection.setSelectedRunIds(new Set(ids))}
            onToggle={(id) => selection.setSelectedRunIds((current) => toggledInSet(current, id))}
          />
        </div>
      </fieldset>
    </AppDialog>
  );
}
