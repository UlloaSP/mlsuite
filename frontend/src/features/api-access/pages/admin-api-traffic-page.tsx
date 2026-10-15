/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { UsagePeriod } from "@/features/api-access/api/api-access.api";
import { useApiTrafficUsage } from "@/features/api-access/api/api-traffic.queries";
import { TrafficClientsCatalog } from "@/features/api-access/components/TrafficClientsCatalog";
import { TrafficOrganizationsCatalog } from "@/features/api-access/components/TrafficOrganizationsCatalog";
import { USAGE_PERIODS, UsagePanel } from "@/features/api-access/components/UsagePanel";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTabPanel, AppTabs } from "@/shared/ui/AppTabs";
import { AppPageHeader } from "@/shared/ui/PageHeader";

const TABS = ["overview", "clients", "organizations"] as const;
type Tab = (typeof TABS)[number];

/**
 * The platform's API traffic, for superadmins: how much every organization's clients call and
 * fail, which client to suspend, and each organization's monthly limit. What clients send stays
 * with their organizations.
 */
export function AdminApiTrafficPage() {
  const [tab, setTab] = useSearchParamState<Tab>("tab", "overview", TABS);
  const [period, setPeriod] = useSearchParamState<UsagePeriod>("period", "day", USAGE_PERIODS);
  const usage = useApiTrafficUsage(period, tab === "overview");

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="API traffic"
          description="Calls of every organization's API clients: counts, outcomes and latency, never their content."
        />
        <AppTabs
          aria-label="API traffic"
          items={[
            { label: "Overview", value: "overview" },
            { label: "Clients", value: "clients" },
            { label: "Organizations", value: "organizations" },
          ]}
          value={tab}
          onChange={setTab}
        >
          <AppTabPanel value={tab} className="flex min-h-0 flex-1 flex-col">
            {tab === "overview" ? (
              <UsagePanel usage={usage} period={period} onPeriodChange={setPeriod} />
            ) : tab === "clients" ? (
              <TrafficClientsCatalog />
            ) : (
              <TrafficOrganizationsCatalog />
            )}
          </AppTabPanel>
        </AppTabs>
      </AppSurface>
    </AppPage>
  );
}
