/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check, Save, X } from "lucide-react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { formatTimestamp } from "@/shared/lib/date-time";
import {
  canSaveSessionEntry,
  sessionEntryStatus,
  type SessionEntry,
} from "@/features/schemas/lib/use-inference-session";

const STATUS_TONE = { SUCCESS: "success", PARTIAL_SUCCESS: "warning", FAILED: "danger" } as const;

type Props = {
  entry: SessionEntry;
  selected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onSave: () => void;
  onRemove: () => void;
};

function EntryState({ entry }: { entry: SessionEntry }) {
  if (entry.state === "running") return <AppBadge tone="info">Running…</AppBadge>;
  if (entry.reportsPending) return <AppBadge tone="info">Reports pending</AppBadge>;
  const status = sessionEntryStatus(entry);
  return <AppBadge tone={STATUS_TONE[status]}>{status}</AppBadge>;
}

/** One run of the session: its name, outcome, and whether it has been kept. */
export function InferenceSessionEntryRow({
  entry,
  selected,
  onSelect,
  onRename,
  onSave,
  onRemove,
}: Props) {
  const locked = entry.state === "saving" || entry.state === "saved";

  return (
    <li
      className={cx(
        "flex flex-col gap-2 rounded-card border bg-surface p-3 transition-colors",
        selected ? "border-accent" : "border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-center gap-1">
        <input
          aria-label="Inference name"
          disabled={locked}
          spellCheck={false}
          value={entry.name}
          onChange={(event) => onRename(event.target.value)}
          className="min-w-0 flex-1 truncate rounded-control bg-transparent px-1 py-0.5 text-sm font-semibold text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default"
        />
        <AppIconButton
          aria-label={`Remove ${entry.name} from the session`}
          className="size-8 shrink-0"
          disabled={entry.state === "saving"}
          onClick={onRemove}
        >
          <X size={15} />
        </AppIconButton>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={selected}
          disabled={entry.state === "running"}
          onClick={onSelect}
          className={cx(
            "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-control px-1 text-left disabled:cursor-default",
            FOCUS_RING,
          )}
        >
          <EntryState entry={entry} />
          <span className="truncate text-xs text-fg-muted">{formatTimestamp(entry.createdAt)}</span>
        </button>
        {entry.state === "saved" ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-success-fg">
            <Check size={14} />
            Saved
          </span>
        ) : (
          <AppButton
            size="sm"
            variant="secondary"
            className="shrink-0"
            disabled={!canSaveSessionEntry(entry)}
            onClick={onSave}
          >
            {entry.state === "saving" ? <AppSpinner size={14} /> : <Save size={14} />}
            Save
          </AppButton>
        )}
      </div>
    </li>
  );
}
