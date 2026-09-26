/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check, Plus, RefreshCcw, Save } from "lucide-react";
import { m as motion } from "motion/react";
import type { DragEvent } from "react";
import { cx } from "@/shared/ui/cx";
import type { Bundle } from "@/features/models/lib/bundle-types";
import { MODEL_EXT_LABEL } from "@/features/models/lib/bundle-utils";
import { BundleFilePill } from "./BundleFilePill";

type Props = {
  bundle: Bundle;
  index: number;
  onSave: () => void;
  onRemove: () => void;
  onRename: (value: string) => void;
  onOneHotSeparatorChange: (value: string) => void;
  onAttachModel: () => void;
  onAttachDf: () => void;
  onDropModel: (file: File) => void;
  onDropDf: (file: File) => void;
};

function dropFile(event: DragEvent<HTMLButtonElement>, handler: (file: File) => void) {
  event.preventDefault();
  event.stopPropagation();
  const file = event.dataTransfer.files[0];
  if (file) handler(file);
}

export function BundleCard({
  bundle,
  index,
  onSave,
  onRemove,
  onRename,
  onOneHotSeparatorChange,
  onAttachModel,
  onAttachDf,
  onDropModel,
  onDropDf,
}: Props) {
  const isSaveable =
    bundle.modelFile && bundle.name.trim() && bundle.oneHotSeparator !== "" && !bundle.saving;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={cx(
        "flex-shrink-0 overflow-hidden rounded-lg border transition-all duration-150",
        bundle.saved
          ? "border-success-border bg-success-subtle"
          : "border-line bg-surface-muted hover:-translate-y-px hover:border-line-strong hover:shadow-hover",
      )}
    >
      <div className="flex items-stretch">
        {/* ── Files section ──────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 border-r border-line px-4 py-3.5">
          {bundle.modelFile ? (
            <BundleFilePill
              name={bundle.modelFile.name}
              size={bundle.modelFile.size}
              kind="model"
              badge="artifact"
            />
          ) : (
            <button
              type="button"
              onClick={onAttachModel}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropFile(event, onDropModel)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-accent bg-accent-subtle px-3 py-[7px] text-xs font-bold text-accent transition-all duration-150 hover:bg-surface-subtle"
            >
              <Plus size={12} />
              Select model{" "}
              <span className="cursor-pointer font-mono text-3xs opacity-70">
                ({MODEL_EXT_LABEL})
              </span>
            </button>
          )}

          {bundle.dfFile ? (
            <BundleFilePill
              name={bundle.dfFile.name}
              size={bundle.dfFile.size}
              kind="df"
              badge="dataframe"
            />
          ) : (
            <button
              type="button"
              onClick={onAttachDf}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropFile(event, onDropDf)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-line bg-surface-subtle px-3 py-[7px] text-xs text-fg-muted transition-all duration-150 hover:border-accent-border hover:bg-accent-subtle hover:text-accent"
            >
              <Plus size={12} />
              Attach dataframe{" "}
              <span className="cursor-pointer font-mono text-3xs opacity-60">(optional)</span>
            </button>
          )}
        </div>

        {/* ── Meta section ───────────────────────────────────────── */}
        <div className="flex w-56 flex-shrink-0 flex-col justify-between gap-2.5 px-4 py-3.5">
          <input
            aria-label={`Rename ${bundle.name}`}
            type="text"
            value={bundle.name}
            onChange={(e) => onRename(e.target.value)}
            placeholder="Model name…"
            disabled={bundle.saved}
            className={cx(
              "w-full rounded-lg border border-line bg-surface-subtle",
              "px-3 py-2 text-xs font-bold text-fg outline-none",
              "transition-all duration-150 focus:border-accent focus:bg-surface",
              bundle.saved && "cursor-not-allowed opacity-70",
            )}
          />

          <label className="flex flex-col gap-1">
            <span className="text-3xs font-bold uppercase text-fg-muted">One-hot separator</span>
            <input
              aria-label={`One-hot separator for ${bundle.name}`}
              type="text"
              value={bundle.oneHotSeparator}
              onChange={(e) => onOneHotSeparatorChange(e.target.value)}
              disabled={bundle.saved}
              className={cx(
                "w-full rounded-lg border border-line bg-surface-subtle",
                "px-3 py-2 font-mono text-xs text-fg outline-none",
                "transition-all duration-150 focus:border-accent focus:bg-surface",
                bundle.saved && "cursor-not-allowed opacity-70",
              )}
            />
          </label>

          <div className="flex items-center justify-between gap-2">
            {bundle.saved ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-success-fg">
                <Check size={13} />
                Saved
              </span>
            ) : (
              <button
                type="button"
                disabled={!isSaveable}
                onClick={onSave}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-lg border-none px-3.5 py-[7px] text-xs font-bold text-on-accent transition-all duration-150",
                  isSaveable
                    ? "cursor-pointer bg-accent hover:-translate-y-px hover:bg-accent-hover"
                    : "cursor-not-allowed bg-accent opacity-40",
                )}
              >
                {bundle.saving ? (
                  <RefreshCcw size={11} className="animate-spin" />
                ) : (
                  <Save size={11} />
                )}
                {bundle.saving ? "…" : "Save"}
              </button>
            )}

            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove bundle"
              className="inline-flex flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-surface px-2.5 py-[7px] text-xs font-bold text-fg-muted transition-all duration-150 hover:border-accent hover:bg-accent-subtle hover:text-accent"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
