/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { usePlatformAuditEventCatalog } from "@/features/workspace/api/workspace-catalog-queries";
import { useOrganizationCatalogPageQuery } from "@/features/workspace/api/workspace.queries";
import { AuditEventList } from "@/features/workspace/components/AuditEventList";
import { AuditLogToolbar } from "@/features/workspace/components/AuditLogToolbar";
import { useAuditFilters } from "@/features/workspace/lib/use-audit-filters";
import { AppCombobox } from "@/shared/ui/AppCombobox";

const SCOPES = [
  { id: "all", label: "All organizations" },
  { id: "platform", label: "Platform events" },
];

/** Every organization's log and the platform's own events, newest first. */
export function PlatformAuditLog() {
  const filters = useAuditFilters();
  const [organizationSearch, setOrganizationSearch] = useState("");
  const log = usePlatformAuditEventCatalog(filters.controls);
  const organizations = useOrganizationCatalogPageQuery(organizationSearch, "name");
  const { organization } = filters.values;
  const named = log.data?.items.find((event) => String(event.organizationId) === organization);

  return (
    <section aria-label="Audit log" className="flex min-h-0 flex-1 flex-col">
      <AuditLogToolbar filters={filters} totalItems={log.data?.totalItems}>
        <div className="w-full sm:w-56">
          <AppCombobox<string>
            aria-label="Filter by organization"
            placeholder="All organizations"
            value={organization}
            items={[
              ...SCOPES,
              ...(organizations.data?.items ?? []).map((item) => ({
                id: String(item.id),
                label: item.name,
              })),
            ]}
            selectedItem={{
              id: organization,
              label: named?.organizationName ?? `Organization #${organization}`,
            }}
            onChange={(item) => filters.setFilters({ organization: item?.id ?? "all" })}
            onSearchChange={setOrganizationSearch}
            hasNext={Boolean(organizations.hasNextPage)}
            onLoadMore={organizations.fetchNextPage}
            loading={organizations.isFetching}
            error={organizations.isError}
            onRetry={organizations.refetch}
          />
        </div>
      </AuditLogToolbar>
      <AuditEventList
        log={log}
        isFiltered={filters.isFiltered}
        emptyDescription="What happens across organizations and on the platform itself appears here as it happens, and is kept for 7 days by default."
        showOrganization
      />
    </section>
  );
}
