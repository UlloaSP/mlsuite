/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { useApiClient, useApiUsage } from "@/features/api-access/api/api-access.queries";
import type { UsagePeriod } from "@/features/api-access/api/api-access.api";
import { ApiClientAccessTab } from "@/features/api-access/components/ApiClientAccessTab";
import { ApiClientKeysTab } from "@/features/api-access/components/ApiClientKeysTab";
import { ApiClientSettingsTab } from "@/features/api-access/components/ApiClientSettingsTab";
import { ApiClientStatusBadge } from "@/features/api-access/components/ApiClientStatusBadge";
import { IssueKeyDialog } from "@/features/api-access/components/IssueKeyDialog";
import { RequestLog } from "@/features/api-access/components/RequestLog";
import { SuspensionNotice } from "@/features/api-access/components/SuspensionNotice";
import { USAGE_PERIODS, UsagePanel } from "@/features/api-access/components/UsagePanel";
import { isHttpError } from "@/shared/api/http";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTabPanel, AppTabs } from "@/shared/ui/AppTabs";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";

const TABS = ["overview", "keys", "access", "requests", "settings"] as const;
type Tab = (typeof TABS)[number];

/** One client: its usage, keys, bookmarks and calls, each a linkable tab. */
export function ApiClientPage() {
  const { clientId = "" } = useParams();
  const id = Number(clientId);
  const canManage = useCan("canManageApiAccess");
  const [tab, setTab] = useSearchParamState<Tab>("tab", "overview", TABS);
  const [period, setPeriod] = useSearchParamState<UsagePeriod>("period", "day", USAGE_PERIODS);
  const [issuing, setIssuing] = useState(false);
  const query = useApiClient(Number.isInteger(id) ? id : undefined);
  const usage = useApiUsage(period, id, Number.isInteger(id) && tab === "overview");

  if (!Number.isInteger(id)) return <RouteStatusPage status={404} />;
  if (query.error) {
    return (
      <RouteStatusPage
        status={isHttpError(query.error) && query.error.status === 404 ? 404 : 500}
      />
    );
  }
  if (!query.data) return <AppPageLoader label="Loading client…" />;

  const client = query.data;
  const active = client.client.status === "ACTIVE";
  const items = [
    { label: "Overview", value: "overview" as const },
    { label: "Keys", value: "keys" as const, count: client.keys.length },
    { label: "Bookmarks", value: "access" as const, count: client.bookmarks.length },
    { label: "Requests", value: "requests" as const },
    ...(canManage ? [{ label: "Settings", value: "settings" as const }] : []),
  ];
  const shown: Tab = tab === "settings" && !canManage ? "overview" : tab;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          breadcrumbs={[
            { label: "API", to: "/api-access" },
            { label: "Clients", to: "/api-access/clients" },
            { label: client.client.name },
          ]}
          title={client.client.name}
          description={client.client.description ?? undefined}
          actions={
            <>
              <ApiClientStatusBadge status={client.client.status} />
              {canManage && active ? (
                <AppButton onClick={() => setIssuing(true)}>
                  <KeyRound size={16} />
                  Issue key
                </AppButton>
              ) : null}
            </>
          }
        />
        <SuspensionNotice client={client.client} />
        <AppTabs aria-label="Client" items={items} value={shown} onChange={setTab}>
          <AppTabPanel value={shown} className="flex min-h-0 flex-1 flex-col">
            {shown === "overview" ? (
              <UsagePanel
                usage={usage}
                period={period}
                onPeriodChange={setPeriod}
                showTopClients={false}
              />
            ) : shown === "keys" ? (
              <ApiClientKeysTab client={client} canManage={canManage} />
            ) : shown === "access" ? (
              <ApiClientAccessTab client={client} canManage={canManage} />
            ) : shown === "requests" ? (
              <RequestLog clientId={client.client.id} />
            ) : (
              <ApiClientSettingsTab client={client} />
            )}
          </AppTabPanel>
        </AppTabs>
        {canManage ? (
          <IssueKeyDialog
            clientId={client.client.id}
            clientName={client.client.name}
            open={issuing}
            onClose={() => setIssuing(false)}
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
