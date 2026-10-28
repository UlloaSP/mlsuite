/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check, Save } from "lucide-react";
import { cx } from "@/shared/ui/cx";
import type { Bundle } from "@/features/models/lib/bundle-types";
import { isBundleSaveable } from "@/features/models/lib/bundle-save";
import { BundleFilePill } from "./BundleFilePill";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSpinner } from "@/shared/ui/AppSpinner";

type Props = {
  bundle: Bundle;
  onSave: () => void;
  onRemove: () => void;
  onRename: (value: string) => void;
};

export function BundleCard({ bundle, onSave, onRemove, onRename }: Props) {
  const unnamed = !bundle.saved && bundle.name.trim() === "";
  return (
    <div
      className={cx(
        "flex-shrink-0 overflow-hidden rounded-card border transition-all duration-150",
        bundle.saved
          ? "border-success-border bg-success-subtle"
          : "border-line bg-surface-muted hover:border-line-strong hover:shadow-hover",
      )}
    >
      <div className="flex items-stretch">
        {/* ── File section ───────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col justify-center border-r border-line px-4 py-3.5">
          <BundleFilePill name={bundle.modelFile.name} size={bundle.modelFile.size} />
        </div>

        {/* ── Meta section ───────────────────────────────────────── */}
        <div className="flex w-56 flex-shrink-0 flex-col justify-between gap-2.5 px-4 py-3.5">
          <input
            aria-label={`Rename ${bundle.name}`}
            type="text"
            value={bundle.name}
            onChange={(e) => onRename(e.target.value)}
            placeholder="Model name…"
            aria-invalid={unnamed}
            aria-describedby={unnamed ? `bundle-${bundle.id}-name` : undefined}
            disabled={bundle.saved}
            className={cx(
              "w-full rounded-control border border-line bg-surface-subtle",
              "px-3 py-2 text-xs font-semibold text-fg outline-none",
              "transition-all duration-150 focus:border-accent focus:bg-surface",
              bundle.saved && "cursor-not-allowed opacity-70",
              unnamed && "border-danger-border",
            )}
          />
          {unnamed ? (
            <p id={`bundle-${bundle.id}-name`} className="text-2xs text-danger-fg">
              Name the model to save it.
            </p>
          ) : bundle.preparing ? (
            <p className="text-2xs text-fg-secondary">Its environment is being prepared.</p>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            {bundle.saved ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-success-fg">
                <Check size={13} />
                Saved
              </span>
            ) : (
              <AppButton size="sm" disabled={!isBundleSaveable(bundle)} onClick={onSave}>
                {bundle.saving ? <AppSpinner size={11} /> : <Save size={11} />}
                {bundle.saving ? "Saving…" : "Save"}
              </AppButton>
            )}

            <AppButton size="sm" variant="secondary" className="shrink-0" onClick={onRemove}>
              Remove
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
