import { Play, RotateCcw, StopCircle } from "lucide-react";
import { AppButton } from "@/shared/ui/AppButton";

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
    <AppButton
      size="sm"
      variant={danger ? "danger" : "secondary"}
      disabled={disabled}
      onClick={onClick}
    >
      {icon} {label}
    </AppButton>
  );
}
