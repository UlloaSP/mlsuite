/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getRouteApi } from "@tanstack/react-router";
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

const route = getRouteApi("/protected/app/superadmin/admin/api-traffic");

/** The accounts with API clients, personal ones among them, by name, each with its month against its limit. */
export function TrafficOrganizationsCatalog() {
  // Accounts are only searched; the page's filter and sort belong to its clients tab.
  const q = route.useSearch({ select: (search) => search.q });
  const controls = useCatalogControls({ q, filter: "all", sort: "name" });
  const query = useApiTrafficOrganizations({
    size: PAGE_SIZE,
    search: controls.search,
    filter: "all",
  });
  const items = query.data?.items ?? [];

  return (
    <section aria-label="Accounts" className="flex min-h-0 flex-1 flex-col">
      <CatalogToolbar
        filter={controls.filter}
        filterLabel="Filter accounts"
        filters={FILTERS}
        onFilterChange={controls.setFilter}
        onQueryChange={controls.setQuery}
        onSortChange={controls.setSort}
        placeholder="Search by account"
        query={controls.query}
        resultCount={query.data?.totalItems ?? 0}
        sort={controls.sort}
        sortLabel="Sort accounts"
        sortOptions={SORTS}
      />
      <CatalogListPanel
        key={controls.search}
        errorMessage={getCatalogErrorMessage(query.error)}
        hasNext={Boolean(query.data?.hasNext)}
        isBusy={query.isLoading || query.isFetching}
        isLoading={query.isLoading}
        itemCount={items.length}
        loadingLabel="Loading accounts…"
        onLoadMore={query.fetchNextPage}
        onRetry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
        emptyState={{
          icon: <Building2 size={22} />,
          title: controls.search ? "No matching accounts" : "No account has API clients",
          description: controls.search
            ? "Try another search term."
            : "Accounts appear here once they create a client.",
        }}
      >
        {items.map((organization) => (
          <TrafficOrganizationEntry key={organization.organizationId} organization={organization} />
        ))}
      </CatalogListPanel>
    </section>
  );
}
