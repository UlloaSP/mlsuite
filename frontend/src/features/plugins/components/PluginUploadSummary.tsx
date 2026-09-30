/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Upload } from "lucide-react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppSummaryRow } from "@/shared/ui/AppSummaryRow";

type Props = {
  total: number;
  uploadable: number;
  invalid: number;
  uploaded: number;
  busy: boolean;
  uploading: boolean;
  onUploadAll: () => void;
  onClear: () => void;
};

const muted = "font-normal text-fg-muted";

export function PluginUploadSummary({
  total,
  uploadable,
  invalid,
  uploaded,
  busy,
  uploading,
  onUploadAll,
  onClear,
}: Props) {
  return (
    <aside
      aria-label="Summary"
      className="flex w-full flex-shrink-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card lg:w-72"
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-5 py-4">
        <span className="text-sm font-semibold text-fg">Summary</span>
        <span className="font-mono text-2xs uppercase tracking-eyebrow text-fg-muted">Session</span>
      </div>

      <div className="flex-shrink-0 px-5 py-3.5">
        <AppSummaryRow
          first
          label="Files"
          value={total ? String(total) : "—"}
          valueClass={total ? "font-semibold text-fg" : muted}
        />
        <AppSummaryRow
          label="Ready to upload"
          value={total ? String(uploadable) : "—"}
          valueClass={uploadable ? "font-semibold text-fg" : muted}
        />
        <AppSummaryRow
          label="Invalid"
          value={total ? String(invalid) : "—"}
          valueClass={invalid ? "font-semibold text-danger-fg" : muted}
        />
        <AppSummaryRow
          label="Uploaded"
          value={total ? `${uploaded} / ${total}` : "—"}
          valueClass={
            !uploaded
              ? muted
              : uploaded === total
                ? "font-semibold text-success-fg"
                : "font-semibold text-warning-fg"
          }
        />
      </div>

      <div className="mt-auto flex flex-shrink-0 flex-col gap-2 border-t border-line px-5 py-3.5">
        <AppButton className="w-full" disabled={!uploadable || busy} onClick={onUploadAll}>
          {uploading ? <AppSpinner size={14} /> : <Upload size={14} />}
          {uploading ? "Uploading…" : "Upload all"}
        </AppButton>
        <AppButton variant="secondary" className="w-full" disabled={uploading} onClick={onClear}>
          Clear
        </AppButton>
      </div>
    </aside>
  );
}
