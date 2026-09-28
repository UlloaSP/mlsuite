/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { FileCode2, X } from "lucide-react";
import { TYPE_META } from "@/features/plugins/lib/catalog-page-model";
import type { PluginUploadItem } from "@/features/plugins/lib/plugin-upload-queue";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTooltip } from "@/shared/ui/AppTooltip";
import { cx } from "@/shared/ui/cx";

const STATUS = {
  checking: { label: "Checking…", tone: "neutral" },
  ready: { label: "Ready", tone: "info" },
  invalid: { label: "Invalid", tone: "danger" },
  uploading: { label: "Uploading…", tone: "neutral" },
  uploaded: { label: "Uploaded", tone: "success" },
  failed: { label: "Upload failed", tone: "danger" },
} as const;

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

export function PluginUploadCard({
  item,
  onRemove,
}: {
  item: PluginUploadItem;
  onRemove: () => void;
}) {
  const status = STATUS[item.status];
  const busy = item.status === "checking" || item.status === "uploading";

  return (
    <article
      className={cx(
        "flex items-start gap-3 rounded-card border bg-surface px-4 py-3",
        item.error ? "border-danger-border" : "border-line",
      )}
    >
      <span className="mt-0.5 flex size-9 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-surface-muted text-fg-muted">
        <FileCode2 size={18} />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-fg">{item.kind ?? item.file.name}</h2>
          {item.pluginType ? (
            <AppBadge tone={TYPE_META[item.pluginType].tone}>
              {TYPE_META[item.pluginType].label}
            </AppBadge>
          ) : null}
          <AppBadge tone={status.tone}>
            {busy ? <AppSpinner size={12} /> : null}
            {status.label}
          </AppBadge>
        </div>
        <p className="truncate font-mono text-2xs text-fg-muted">
          {item.file.name} · {formatSize(item.file.size)}
        </p>
        {item.error ? <p className="text-xs leading-5 text-danger-fg">{item.error}</p> : null}
      </div>
      <AppTooltip label={`Remove ${item.file.name}`}>
        <AppIconButton
          aria-label={`Remove ${item.file.name}`}
          disabled={item.status === "uploading"}
          onClick={onRemove}
        >
          <X size={16} />
        </AppIconButton>
      </AppTooltip>
    </article>
  );
}
