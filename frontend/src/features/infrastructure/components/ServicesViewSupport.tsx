import { Play, RotateCcw, StopCircle } from "lucide-react";
import { cx } from "@/shared/ui/cx";

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
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-3xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "border-danger-subtle text-danger-fg hover:bg-danger-subtle"
          : "border-line text-fg-secondary hover:bg-surface-muted hover:text-fg",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}
