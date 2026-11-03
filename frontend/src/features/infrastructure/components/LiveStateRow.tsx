import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cx } from "@/shared/ui/cx";
import type { DashboardAlert } from "@/features/infrastructure/lib/dashboard-summary";
import { alertTone } from "@/features/infrastructure/lib/alert-tone";

export function LiveStateRow({ state }: { state: DashboardAlert }) {
  const Icon = state.tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div
        className={cx(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          alertTone(state.tone),
        )}
      >
        <Icon size={15} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{state.title}</p>
        <p className="mt-0.5 text-xs text-fg-secondary">{state.detail}</p>
      </div>
    </div>
  );
}
