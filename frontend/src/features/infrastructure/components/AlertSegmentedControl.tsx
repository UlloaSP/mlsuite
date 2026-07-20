import { cx } from "@/shared/ui/cx";

export function AlertSegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] p-0.5">
      {options.map((option) => (
        <button
          type="button"
          key={option.key}
          className={cx(
            "rounded-md px-2.5 py-1 text-[0.68rem] font-medium transition",
            value === option.key
              ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
