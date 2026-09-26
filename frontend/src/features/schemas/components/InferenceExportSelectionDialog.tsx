import { useMemo } from "react";
import { useReviewRunSelection } from "@/capabilities/review-creation/useReviewRunSelection";
import { ReviewSelectionCatalog } from "@/capabilities/review-creation/ReviewSelectionCatalog";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppButton } from "@/shared/ui/AppButton";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSelect } from "@/shared/ui/AppSelect";
import type { InferenceExportCandidate } from "./OrganizationInferenceExportButton";

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
  const candidates = useMemo(
    () =>
      items.map((item) => ({
        runId: String(item.id),
        name: item.name,
        createdAt: item.createdAt,
        schemaId: String(item.schemaId),
        versionId: String(item.schemaVersionId),
        groupLabel: `${item.schemaName} · ${item.schemaVersionName} · v${item.schemaVersion}`,
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
            {busy ? "Preparing export..." : "Continue"}
          </AppButton>
        </>
      }
    >
      <fieldset disabled={busy}>
        <div className="grid shrink-0 gap-4 border-b border-line px-6 py-4 sm:grid-cols-2">
          <AppFieldLabel label="Schema snapshot">
            <AppSelect
              aria-label="Schema snapshot"
              value={selection.group?.key}
              onValueChange={selection.selectGroup}
              disabled={busy}
              className="w-full min-w-0"
              options={selection.groups.map((group) => ({
                value: group.key,
                label: group.label,
              }))}
            />
          </AppFieldLabel>
          <AppFieldLabel label="Bookmark">
            <AppSelect
              aria-label="Bookmark"
              value={selection.bookmark}
              onValueChange={selection.selectBookmark}
              disabled={busy}
              className="w-full min-w-0"
              options={[{ value: "all", label: "All bookmarks" }, ...selection.bookmarkOptions]}
            />
          </AppFieldLabel>
        </div>
        <div>
          <ReviewSelectionCatalog
            key={`${selection.group?.key}:${selection.bookmark}`}
            title="Inferences"
            emptyDescription="No inferences are available for this selection."
            items={selection.runCandidates.map((item) => ({
              id: item.runId,
              title: item.name,
              detail: formatTimestamp(item.createdAt),
            }))}
            selectedIds={selection.selectedRunIds}
            onClear={() => selection.setSelectedRunIds(new Set())}
            onSelectAll={(ids) => selection.setSelectedRunIds(new Set(ids))}
            onToggle={(id) =>
              selection.setSelectedRunIds((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
          />
        </div>
      </fieldset>
    </AppDialog>
  );
}
