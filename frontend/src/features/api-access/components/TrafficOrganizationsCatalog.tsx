/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Building2 } from "lucide-react";
import { useApiTrafficOrganizations } from "@/features/api-access/api/api-traffic.queries";
import { TrafficOrganizationEntry } from "@/features/api-access/components/TrafficOrganizationEntry";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { CatalogToolbar } from "@/shared/ui/catalog/CatalogToolbar";
import { getCatalogErrorMessage } from "@/shared/ui/catalog/catalogPageUtils";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";

const PAGE_SIZE = 24;
const FILTERS = [{ value: "all" as const, label: "All" }];
const SORTS = [{ value: "name" as const, label: "Name" }];

/** The organizations with API clients, by name, each with its month against its limit. */
export function TrafficOrganizationsCatalog() {
  const controls = useCatalogControls<"all", "name">({
    filters: ["all"],
    initialFilter: "all",
    initialSort: "name",
    sorts: ["name"],
  });
  const query = useApiTrafficOrganizations({
    size: PAGE_SIZE,
    search: controls.search,
    filter: "all",
  });
  const items = query.data?.items ?? [];

  return (
    <section aria-label="Organizations" className="flex min-h-0 flex-1 flex-col">
      <CatalogToolbar
        filter={controls.filter}
        filterLabel="Filter organizations"
        filters={FILTERS}
        onFilterChange={controls.setFilter}
        onQueryChange={controls.setQuery}
        onSortChange={controls.setSort}
        placeholder="Search by organization"
        query={controls.query}
        resultCount={query.data?.totalItems ?? 0}
        sort={controls.sort}
        sortLabel="Sort organizations"
        sortOptions={SORTS}
      />
      <CatalogListPanel
        key={controls.search}
        errorMessage={getCatalogErrorMessage(query.error)}
        hasNext={Boolean(query.data?.hasNext)}
        isBusy={query.isLoading || query.isFetching}
        isLoading={query.isLoading}
        itemCount={items.length}
        loadingLabel="Loading organizations…"
        onLoadMore={query.fetchNextPage}
        onRetry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
        emptyState={{
          icon: <Building2 size={22} />,
          title: controls.search ? "No matching organizations" : "No organization has API clients",
          description: controls.search
            ? "Try another search term."
            : "Organizations appear here once they create a client.",
        }}
      >
        {items.map((organization) => (
          <TrafficOrganizationEntry key={organization.organizationId} organization={organization} />
        ))}
      </CatalogListPanel>
    </section>
  );
}
