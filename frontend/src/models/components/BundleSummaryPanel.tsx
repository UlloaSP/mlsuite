/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RefreshCcw, Save } from "lucide-react";
import { cx } from "../../app/components/ui-utils";

type Props = {
  total: number;
  withDf: number;
  saved: number;
  unsavedReady: number;
  anySaving: boolean;
  onSaveAll: () => void;
  onClear: () => void;
};

type RowProps = {
  label: string;
  value: string;
  valueClass: string;
  first?: boolean;
};

function SummaryRow({ label, value, valueClass, first }: RowProps) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-4 py-[7px]",
        !first && "border-t border-[var(--border-soft)]",
      )}
    >
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
      <span className={cx("font-mono text-[12px]", valueClass)}>{value}</span>
    </div>
  );
}

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
  const bundleCls = total
    ? "font-bold text-[var(--text-primary)]"
    : "font-normal text-[var(--text-muted)]";

  const dfVal = total ? `${withDf} / ${total}` : "—";
  const dfCls = !total
    ? "font-normal text-[var(--text-muted)]"
    : withDf === total
      ? "font-bold text-green-500"
      : "font-bold text-amber-500";

  const savedVal = total ? `${saved} / ${total}` : "—";
  const savedCls = !total
    ? "font-normal text-[var(--text-muted)]"
    : saved === total
      ? "font-bold text-green-500"
      : saved > 0
        ? "font-bold text-amber-500"
        : "font-normal text-[var(--text-muted)]";

  return (
    <aside
      aria-label="Summary"
      className="flex w-[288px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)]"
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border-soft)] px-[18px] py-[15px]">
        <span className="text-[13px] font-bold text-[var(--text-primary)]">Summary</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Session
        </span>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 px-[18px] py-[14px]">
        <SummaryRow first label="Bundles" value={bundleVal} valueClass={bundleCls} />
        <SummaryRow label="With dataframe" value={dfVal} valueClass={dfCls} />
        <SummaryRow label="Saved" value={savedVal} valueClass={savedCls} />
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-shrink-0 flex-col gap-2 border-t border-[var(--border-soft)] px-[18px] py-[14px]">
        <button
          type="button"
          disabled={!canSave}
          onClick={onSaveAll}
          className={cx(
            "flex w-full items-center justify-center gap-[7px] rounded-[9px] border-none px-3 py-[11px] text-[13px] font-bold text-white transition-all duration-150",
            canSave
              ? "bg-[var(--accent-primary)] hover:-translate-y-px hover:bg-[var(--accent-primary-strong)]"
              : "cursor-not-allowed bg-[var(--accent-primary)] opacity-40",
          )}
        >
          {anySaving ? <RefreshCcw size={13} className="animate-spin" /> : <Save size={13} />}
          {anySaving ? "Saving…" : "Save All"}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="flex w-full items-center justify-center rounded-[9px] border border-[var(--border-soft)] bg-transparent px-3 py-[11px] text-[13px] font-bold text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
        >
          Clear
        </button>
      </div>
    </aside>
  );
}
