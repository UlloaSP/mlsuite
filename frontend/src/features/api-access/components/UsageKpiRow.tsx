/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { formatCount, formatDuration, formatShare } from "@/features/api-access/lib/api-format";
import { UsageTile } from "@/features/api-access/components/UsageTile";
import { formatDate } from "@/shared/lib/date-time";
import type { ApiUsageDto } from "@/shared/api/openapi.gen";

const PERIOD_LABEL: Record<string, string> = {
  day: "last 24 hours",
  week: "last 7 days",
  month: "last 30 days",
};

/**
 * The headline numbers of a period. The platform sees how many organizations called; an
 * organization sees its calendar month against its limit instead.
 */
export function UsageKpiRow({ usage }: { usage: ApiUsageDto }) {
  const period = PERIOD_LABEL[usage.period] ?? usage.period;
  const errors = usage.rejected + usage.failed;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UsageTile label="Calls" value={formatCount(usage.calls)} sub={period} />
      <UsageTile
        label="Error rate"
        value={formatShare(errors, usage.calls)}
        sub={`${formatCount(usage.rejected)} refused (4xx) · ${formatCount(usage.failed)} failed (5xx)`}
      />
      <UsageTile
        label="p95 latency"
        value={formatDuration(usage.p95DurationMs)}
        sub="of succeeded calls"
      />
      {usage.month ? (
        <UsageTile
          label="This month"
          value={`${formatCount(usage.month.calls)} / ${formatCount(usage.month.limit)}`}
          sub={`Succeeded calls · resets ${formatDate(usage.month.resetsAt)}`}
        />
      ) : (
        <UsageTile
          label="Organizations"
          value={formatCount(usage.activeOrganizations)}
          sub={`${formatCount(usage.activeClients)} ${usage.activeClients === 1 ? "client" : "clients"} called · ${formatCount(usage.runtimeBusy)} turned away busy`}
        />
      )}
    </div>
  );
}
