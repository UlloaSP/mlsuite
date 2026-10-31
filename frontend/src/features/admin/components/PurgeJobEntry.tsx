import { AlertTriangle, RotateCcw } from "lucide-react";
import { PurgeCounts } from "@/capabilities/purge/PurgeCounts";
import { SCOPE_LABELS } from "@/capabilities/purge/purge-labels";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppBadge, enumLabel } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { PurgeJobDto } from "@/shared/api/openapi.gen";

const TONES = {
  QUEUED: "neutral",
  RUNNING: "info",
  COMPLETED: "success",
  FAILED: "danger",
} as const;

/** One purge: what it targets, how far it got, and its error and retry once it failed. */
export function PurgeJobEntry({
  disabled,
  job,
  onRetry,
}: {
  disabled: boolean;
  job: PurgeJobDto;
  onRetry: () => void;
}) {
  const Icon = SECTION_ICONS.purges;
  const done = job.status === "COMPLETED";
  return (
    <CatalogEntry
      title={job.targetLabel}
      titleAccessory={<AppBadge tone={TONES[job.status]}>{job.status}</AppBadge>}
      icon={<Icon size={16} className="mt-1 text-fg-secondary" />}
      metadata={
        <>
          <span>{SCOPE_LABELS[job.scope]}</span>
          <span>Asked by {job.requestedByLabel}</span>
          <span>{formatTimestamp(job.createdAt)}</span>
          {done ? null : (
            <span>
              Step {job.phaseNumber} of {job.phaseCount}: {enumLabel(job.phase)}
            </span>
          )}
        </>
      }
      details={
        <div className="flex w-full flex-col gap-2 lg:w-96">
          {job.error ? (
            <p className="flex items-start gap-1 text-sm break-words text-danger-fg">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {job.error}
            </p>
          ) : null}
          <PurgeCounts counts={job.counts} />
        </div>
      }
      actions={
        job.status === "FAILED" ? (
          <AppButton size="sm" variant="secondary" disabled={disabled} onClick={onRetry}>
            <RotateCcw size={14} />
            Retry
          </AppButton>
        ) : undefined
      }
    />
  );
}
