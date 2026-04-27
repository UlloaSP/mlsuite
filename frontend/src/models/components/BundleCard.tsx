/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check, Plus, RefreshCcw, Save, X } from "lucide-react";
import { motion } from "motion/react";
import { cx } from "../../app/components";
import type { Bundle } from "../bundle-types";
import { BundleFilePill } from "./BundleFilePill";

type Props = {
  bundle: Bundle;
  index: number;
  onSave: () => void;
  onRemove: () => void;
  onRename: (value: string) => void;
  onAttachDf: () => void;
};

export function BundleCard({ bundle, index, onSave, onRemove, onRename, onAttachDf }: Props) {
  const isSaveable = bundle.name.trim() && !bundle.saving;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={cx(
        "flex-shrink-0 overflow-hidden rounded-[10px] border transition-all duration-150",
        bundle.saved
          ? "border-[#b4ebc8] bg-gradient-to-br from-green-500/[0.045] to-[var(--surface-muted)]"
          : "border-[var(--border-soft)] bg-[var(--surface-muted)] hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)]",
      )}
    >
      <div className="flex items-stretch">
        {/* ── Files section ──────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 border-r border-[var(--border-soft)] px-4 py-3.5">
          <BundleFilePill
            name={bundle.modelFile.name}
            size={bundle.modelFile.size}
            kind="model"
            badge="artifact"
          />

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
              className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-[var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-[7px] text-[12px] text-[var(--text-muted)] transition-all duration-150 hover:border-blue-400 hover:bg-blue-500/10 hover:text-blue-500"
            >
              <Plus size={12} />
              Attach dataframe <span className="font-mono text-[10px] opacity-60">(optional)</span>
            </button>
          )}
        </div>

        {/* ── Meta section ───────────────────────────────────────── */}
        <div className="flex w-56 flex-shrink-0 flex-col justify-between gap-2.5 px-4 py-3.5">
          <input
            type="text"
            value={bundle.name}
            onChange={(e) => onRename(e.target.value)}
            placeholder="Model name…"
            disabled={bundle.saved}
            className={cx(
              "w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-secondary)]",
              "px-3 py-2 text-[12px] font-bold text-[var(--text-primary)] outline-none",
              "transition-all duration-150 focus:border-[var(--accent-primary)] focus:bg-[var(--surface-primary)]",
              bundle.saved && "cursor-not-allowed opacity-70",
            )}
          />

          <div className="flex items-center justify-between gap-2">
            {bundle.saved ? (
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-green-500">
                <Check size={13} />
                Saved
              </span>
            ) : (
              <button
                type="button"
                disabled={!isSaveable}
                onClick={onSave}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-lg border-none px-3.5 py-[7px] text-[12px] font-bold text-white transition-all duration-150",
                  isSaveable
                    ? "bg-[var(--accent-primary)] hover:-translate-y-px hover:bg-[var(--accent-primary-strong)]"
                    : "cursor-not-allowed bg-[var(--accent-primary)] opacity-40",
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
              className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-muted)] transition-all duration-150 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-quiet)] hover:text-[var(--accent-primary)]"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
