/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RefreshCcw, Save } from "lucide-react";
import { cx } from "@/shared/ui/cx";
import { SummaryRow } from "./SummaryRow";

type Props = {
  total: number;
  withDf: number;
  saved: number;
  unsavedReady: number;
  anySaving: boolean;
  onSaveAll: () => void;
  onClear: () => void;
};

export function BundleSummaryPanel({
  total,
  withDf,
  saved,
  unsavedReady,
  anySaving,
  onSaveAll,
  onClear,
}: Props) {
  const canSave = unsavedReady > 0 && !anySaving;

  const bundleVal = total ? String(total) : "—";
  const bundleCls = total ? "font-bold text-fg" : "font-normal text-fg-muted";

  const dfVal = total ? `${withDf} / ${total}` : "—";
  const dfCls = !total
    ? "font-normal text-fg-muted"
    : withDf === total
      ? "font-bold text-success-fg"
      : "font-bold text-warning-fg";

  const savedVal = total ? `${saved} / ${total}` : "—";
  const savedCls = !total
    ? "font-normal text-fg-muted"
    : saved === total
      ? "font-bold text-success-fg"
      : saved > 0
        ? "font-bold text-warning-fg"
        : "font-normal text-fg-muted";

  return (
    <aside
      aria-label="Summary"
      className="flex w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:w-[288px]"
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-[18px] py-[15px]">
        <span className="text-sm font-bold text-fg">Summary</span>
        <span className="font-mono text-3xs uppercase tracking-[0.1em] text-fg-muted">Session</span>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 px-[18px] py-[14px]">
        <SummaryRow first label="Bundles" value={bundleVal} valueClass={bundleCls} />
        <SummaryRow label="With dataframe" value={dfVal} valueClass={dfCls} />
        <SummaryRow label="Saved" value={savedVal} valueClass={savedCls} />
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-shrink-0 flex-col gap-2 border-t border-line px-[18px] py-[14px]">
        <button
          type="button"
          disabled={!canSave}
          onClick={onSaveAll}
          className={cx(
            "flex w-full items-center justify-center gap-[7px] rounded-lg border-none px-3 py-[11px] text-sm font-bold text-on-accent transition-all duration-150",
            canSave
              ? "cursor-pointer bg-accent hover:-translate-y-px hover:bg-accent-hover"
              : "cursor-not-allowed bg-accent opacity-40",
          )}
        >
          {anySaving ? <RefreshCcw size={13} className="animate-spin" /> : <Save size={13} />}
          {anySaving ? "Saving…" : "Save All"}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-line bg-transparent px-3 py-[11px] text-sm font-bold text-fg-secondary transition-all duration-150 hover:bg-surface-muted hover:text-fg"
        >
          Clear
        </button>
      </div>
    </aside>
  );
}
