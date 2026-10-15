/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { UseQueryResult } from "@tanstack/react-query";
import { RecentFailuresList } from "@/features/api-access/components/RecentFailuresList";
import { TopClientsList } from "@/features/api-access/components/TopClientsList";
import { UsageChart } from "@/features/api-access/components/UsageChart";
import { UsageKpiRow } from "@/features/api-access/components/UsageKpiRow";
import { UsageSection } from "@/features/api-access/components/UsageSection";
import { failureMessage } from "@/features/api-access/lib/api-format";
import type { UsagePeriod } from "@/features/api-access/api/api-access.api";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppSegmentedControl } from "@/shared/ui/AppSegmentedControl";
import type { ApiUsageDto } from "@/shared/api/openapi.gen";

export const USAGE_PERIODS = ["day", "week", "month"] as const;

const PERIOD_OPTIONS = [
  { value: "day", label: "24 hours" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
] as const;

type Props = {
  usage: UseQueryResult<ApiUsageDto>;
  period: UsagePeriod;
  onPeriodChange: (period: UsagePeriod) => void;
  /** Lists the period's busiest clients; off for one client's own usage. */
  showTopClients?: boolean;
  clientHref?: (clientId: number) => string;
};

/** Usage read from the request log: headline numbers, calls over time, and who calls or fails. */
export function UsagePanel({
  usage,
  period,
  onPeriodChange,
  showTopClients = true,
  clientHref,
}: Props) {
  const data = usage.data;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppSegmentedControl
          size="sm"
          label="Period"
          options={PERIOD_OPTIONS}
          value={period}
          onChange={onPeriodChange}
        />
        {data ? (
          <p className="text-xs text-fg-muted">
            Calls are kept for {data.retentionDays} days. Hours and days are UTC buckets, labelled
            in your local time.
          </p>
        ) : null}
      </div>
      {usage.isLoading ? (
        <AppLoadingState compact label="Loading usage…" />
      ) : !data ? (
        <AppEmptyState
          compact
          title="Usage did not load"
          description={failureMessage(usage.error)}
          action={
            <AppButton variant="secondary" onClick={() => void usage.refetch()}>
              Try again
            </AppButton>
          }
        />
      ) : (
        <>
          <UsageKpiRow usage={data} />
          <UsageSection title="Calls over time">
            <UsageChart points={data.series} hourly={data.period === "day"} />
          </UsageSection>
          <div className={showTopClients ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
            {showTopClients ? (
              <UsageSection title="Busiest clients">
                <TopClientsList clients={data.topClients} clientHref={clientHref} />
              </UsageSection>
            ) : null}
            <UsageSection title="Recent failures">
              <RecentFailuresList failures={data.recentFailures} />
            </UsageSection>
          </div>
        </>
      )}
    </div>
  );
}
