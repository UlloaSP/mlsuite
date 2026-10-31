/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCan } from "@/capabilities/workspace-context/workspace-context";
import type { UsagePeriod } from "@/features/api-access/api/api-access.api";
import { useApiClientCatalog, useApiUsage } from "@/features/api-access/api/api-access.queries";
import { CreateApiClientButton } from "@/features/api-access/components/CreateApiClientButton";
import { USAGE_PERIODS, UsagePanel } from "@/features/api-access/components/UsagePanel";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { SECTION_ICONS } from "@/shared/ui/section-icons";

const ApiIcon = SECTION_ICONS.api;

/**
 * How the organization's API is used, read from its request log. An organization without
 * clients is told what a client is instead of being shown empty charts.
 */
export function ApiOverviewPage() {
  const canManage = useCan("canManageApiAccess");
  const [period, setPeriod] = useSearchParamState<UsagePeriod>("period", "day", USAGE_PERIODS);
  const clients = useApiClientCatalog({ size: 1, search: "", filter: "all", sort: "updated" });
  const hasClients = (clients.data?.totalItems ?? 0) > 0;
  const usage = useApiUsage(period, undefined, hasClients);

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="API"
          description="Outside software runs this workspace's bookmarks through the client API with its own keys."
          actions={canManage ? <CreateApiClientButton /> : undefined}
        />
        {clients.isLoading ? (
          <AppLoadingState compact label="Loading API usage…" />
        ) : hasClients || clients.error ? (
          <UsagePanel
            usage={usage}
            period={period}
            onPeriodChange={setPeriod}
            clientHref={(clientId) => `/api-access/clients/${clientId}`}
          />
        ) : (
          <AppEmptyState
            icon={<ApiIcon size={22} />}
            title="No clients yet"
            description={
              canManage
                ? "A client is one piece of outside software. Create it, issue it a key and give it the bookmarks it may run; its calls and their outcomes then appear here."
                : "Members who manage API access create clients for outside software; their calls then appear here."
            }
            action={canManage ? <CreateApiClientButton /> : undefined}
          />
        )}
      </AppSurface>
    </AppPage>
  );
}
