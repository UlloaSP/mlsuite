import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatMeasure } from "@/shared/lib/format-measure";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppBadge } from "@/shared/ui/AppBadge";
import { cx } from "@/shared/ui/cx";
import type { SystemAlertDto } from "@/shared/api/openapi.gen";
import { alertTone } from "@/features/infrastructure/lib/alert-tone";

const measures = ({ value, threshold, latestValue, unit, resolvedAt }: SystemAlertDto) => {
  // A signal without a unit is a state: there is nothing to quote.
  if (unit === "") return null;
  const reached = `Reached ${formatMeasure(value, unit)}, threshold ${formatMeasure(threshold, unit)}`;
  const now = formatMeasure(latestValue, unit);
  return `${reached} · ${resolvedAt ? "ended at" : "now"} ${now}`;
};

export function SystemAlertRow({ alert }: { alert: SystemAlertDto }) {
  const resolved = alert.resolvedAt !== null;
  const critical = alert.severity === "CRITICAL";
  const tone = resolved ? "success" : critical ? "danger" : "warning";
  const Icon = resolved ? CheckCircle2 : AlertTriangle;
  const detail = measures(alert);

  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div
        className={cx(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          alertTone(tone),
        )}
      >
        <Icon size={15} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
          {alert.label}
          <AppBadge tone={critical ? "danger" : "warning"}>{alert.severity}</AppBadge>
        </p>
        {detail ? <p className="mt-0.5 text-xs text-fg-secondary">{detail}</p> : null}
        <p className="mt-0.5 text-xs text-fg-muted">
          Raised {formatTimestamp(alert.raisedAt)}
          {alert.resolvedAt ? ` · Resolved ${formatTimestamp(alert.resolvedAt)}` : null}
        </p>
      </div>
    </div>
  );
}
