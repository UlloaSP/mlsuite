/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import { AppCheckMark } from "@/shared/ui/AppCheckMark";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import { getModelAlgorithmLabel } from "@/capabilities/prediction-runtime/data/model-utils";
import type { SchemaSourceModel } from "@/features/schemas/lib/merge";

/** One selectable model row: the row itself is the toggle. */
export function SchemaModelOption({
  available,
  model,
  selected,
  onToggle,
}: {
  available: boolean;
  model: SchemaSourceModel;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = SECTION_ICONS.models;

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={!available}
      onClick={onToggle}
      className={cx(
        "flex w-full shrink-0 cursor-pointer items-center gap-3 rounded-card border p-3 text-left transition disabled:cursor-not-allowed",
        FOCUS_RING,
        selected
          ? "border-accent bg-accent-subtle"
          : "border-line bg-surface hover:border-line-strong disabled:hover:border-line",
      )}
    >
      <AppCheckMark checked={selected} className={cx(!available && "opacity-45")} />
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-accent">
        <Icon size={18} />
      </span>
      <span className={cx("min-w-0 flex-1", !available && "opacity-60")}>
        <span className="block truncate text-sm font-semibold text-fg">{model.name}</span>
        <span className="block truncate text-xs text-fg-secondary">
          {getModelAlgorithmLabel(model)}
        </span>
      </span>
      {available ? null : <AppBadge tone="neutral">No input schema</AppBadge>}
    </button>
  );
}
