/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getRouteApi } from "@tanstack/react-router";
import { RequestLog } from "@/features/api-access/components/RequestLog";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";

const route = getRouteApi("/protected/app/can-view-api-access/api-access/requests");

/** Every call the organization's clients made with a valid key, newest first. */
export function ApiRequestsPage() {
  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          breadcrumbs={[{ label: "API", to: "/api-access" }, { label: "Requests" }]}
          title="Requests"
          description="Each call made with a valid key, with the status and problem code it was answered with. A call that ran links to its inference."
        />
        <RequestLog search={route.useSearch()} />
      </AppSurface>
    </AppPage>
  );
}
