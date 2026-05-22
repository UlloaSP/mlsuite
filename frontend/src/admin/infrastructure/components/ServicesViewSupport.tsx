import { Play, RotateCcw, StopCircle } from "lucide-react";
import { cx } from "../../../app/components";
import type { SortDir, SortKey } from "./ServicesView";

export function ActionBtn({
  action,
  label,
  disabled,
  danger,
  onClick,
}: {
  action: "START" | "STOP" | "RESTART";
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const icon =
    action === "START" ? (
      <Play size={12} />
    ) : action === "STOP" ? (
      <StopCircle size={12} />
    ) : (
      <RotateCcw size={12} />
    );
  return (
    <button
      className={cx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.65rem] font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "border-[var(--danger-quiet)] text-[var(--danger-text)] hover:bg-[var(--danger-quiet)]"
          : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}

export function SortTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className="cursor-pointer select-none px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && <span className="ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          className={cx(
            "rounded-md px-2.5 py-1 text-[0.68rem] font-medium transition",
            value === opt.key
              ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
