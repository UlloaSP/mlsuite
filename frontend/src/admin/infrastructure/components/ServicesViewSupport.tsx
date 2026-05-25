import { Play, RotateCcw, StopCircle } from "lucide-react";
import { cx } from "../../../app/components/ui-utils";

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
      type="button"
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
