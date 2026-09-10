import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useReviewRunSelection } from "@/capabilities/review-creation/useReviewRunSelection";
import { ReviewSelectionCatalog } from "@/capabilities/review-creation/ReviewSelectionCatalog";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppButton } from "@/shared/ui/AppButton";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppIconButton } from "@/shared/ui/AppIconButton";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
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
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setPortalContainer(dialog);
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="inference-export-title"
      onCancel={onClose}
      className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-4 text-inherit backdrop:bg-black/45"
    >
      <div className="flex max-h-[min(860px,calc(100dvh-2rem))] w-[min(1024px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-hover)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <h2 id="inference-export-title" className="text-xl font-semibold">
              Export to CSV
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Choose inferences, then review the feedback to include before downloading.
            </p>
          </div>
          <AppIconButton type="button" aria-label="Close export" onClick={onClose}>
            <X size={18} />
          </AppIconButton>
        </header>
        <fieldset disabled={busy} className="flex min-h-0 flex-1 flex-col">
          <div className="grid shrink-0 gap-4 border-b border-[var(--border-soft)] px-6 py-4 sm:grid-cols-2">
            <AppFieldLabel label="Schema snapshot">
              <AppSelect
                aria-label="Schema snapshot"
                portalContainer={portalContainer}
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
                portalContainer={portalContainer}
                value={selection.bookmark}
                onValueChange={selection.selectBookmark}
                disabled={busy}
                className="w-full min-w-0"
                options={[{ value: "all", label: "All bookmarks" }, ...selection.bookmarkOptions]}
              />
            </AppFieldLabel>
          </div>
          <div className="app-scroll min-h-0 overflow-y-auto">
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
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] px-6 py-4">
          <div>
            {error ? (
              <div className="flex items-center gap-3">
                <p role="alert" className="text-sm">
                  Could not prepare inference export.
                </p>
                <AppButton variant="secondary" onClick={onRetry}>
                  Retry
                </AppButton>
              </div>
            ) : null}
          </div>
          <div className="flex gap-3">
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
          </div>
        </footer>
      </div>
    </dialog>
  );
}
