/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getRouteApi } from "@tanstack/react-router";
import { useApiTrafficUsage } from "@/features/api-access/api/api-traffic.queries";
import { TrafficClientsCatalog } from "@/features/api-access/components/TrafficClientsCatalog";
import { TrafficOrganizationsCatalog } from "@/features/api-access/components/TrafficOrganizationsCatalog";
import { UsagePanel } from "@/features/api-access/components/UsagePanel";
import { useSearchUpdate } from "@/shared/lib/use-search-update";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTabPanel, AppTabs } from "@/shared/ui/AppTabs";
import { AppPageHeader } from "@/shared/ui/PageHeader";


const route = getRouteApi("/protected/app/superadmin/admin/api-traffic");

/**
 * The platform's API traffic, for superadmins: how much every organization's clients call and
 * fail, which client to suspend, and each organization's monthly limit. What clients send stays
 * with their organizations.
 */
export function AdminApiTrafficPage() {
  const search = route.useSearch();
  const updateSearch = useSearchUpdate<typeof search>();
  const tab = search.tab;
  const setTab = (value: typeof tab) => updateSearch({ tab: value });
  const period = search.period;
  const setPeriod = (value: typeof period) => updateSearch({ period: value });
  const usage = useApiTrafficUsage(period, tab === "overview");

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="API traffic"
          description="Calls of every account's API clients: counts, outcomes and latency, never their content."
        />
        <AppTabs
          aria-label="API traffic"
          items={[
            { label: "Overview", value: "overview" },
            { label: "Clients", value: "clients" },
            { label: "Accounts", value: "organizations" },
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
