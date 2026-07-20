import { cx } from "@/shared/ui/cx";

export function OverviewSegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] p-0.5">
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={cx(
            "rounded-md px-2.5 py-1 text-[0.68rem] font-medium transition",
            value === option
              ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
