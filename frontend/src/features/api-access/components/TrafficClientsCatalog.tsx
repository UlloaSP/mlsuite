/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useApiTrafficClients } from "@/features/api-access/api/api-traffic.queries";
import { TrafficClientEntry } from "@/features/api-access/components/TrafficClientEntry";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { CatalogToolbar } from "@/shared/ui/catalog/CatalogToolbar";
import { getCatalogErrorMessage } from "@/shared/ui/catalog/catalogPageUtils";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { SECTION_ICONS } from "@/shared/ui/section-icons";

const PAGE_SIZE = 24;
type Filter = "all" | "active" | "suspended";
type Sort = "updated" | "name" | "organization";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "name", label: "Name" },
  { value: "organization", label: "Organization" },
];

const ClientIcon = SECTION_ICONS.api;

/** Every organization's clients, searched by client or organization name. */
export function TrafficClientsCatalog() {
  const controls = useCatalogControls<Filter, Sort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "updated",
    sorts: SORTS.map(({ value }) => value),
  });
  const query = useApiTrafficClients({
    size: PAGE_SIZE,
    search: controls.search,
    filter: controls.filter,
    sort: controls.sort,
  });
  const items = query.data?.items ?? [];
  const filtered = Boolean(controls.search) || controls.filter !== "all";

  return (
    <section aria-label="Clients" className="flex min-h-0 flex-1 flex-col">
      <CatalogToolbar
        filter={controls.filter}
        filterLabel="Filter clients"
        filters={FILTERS}
        onFilterChange={controls.setFilter}
        onQueryChange={controls.setQuery}
        onSortChange={controls.setSort}
        placeholder="Search by client or organization"
        query={controls.query}
        resultCount={query.data?.totalItems ?? 0}
        sort={controls.sort}
        sortLabel="Sort clients"
        sortOptions={SORTS}
      />
      <CatalogListPanel
        key={`${controls.search}:${controls.filter}:${controls.sort}`}
        errorMessage={getCatalogErrorMessage(query.error)}
        hasNext={Boolean(query.data?.hasNext)}
        isBusy={query.isLoading || query.isFetching}
        isLoading={query.isLoading}
        itemCount={items.length}
        loadingLabel="Loading clients…"
        onLoadMore={query.fetchNextPage}
        onRetry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
        emptyState={{
          icon: <ClientIcon size={22} />,
          title: filtered ? "No matching clients" : "No API clients on this instance",
          description: filtered
            ? "Try another filter or search term."
            : "Clients appear here when an organization creates one.",
        }}
      >
        {items.map((client) => (
          <TrafficClientEntry key={client.id} client={client} />
        ))}
      </CatalogListPanel>
    </section>
  );
}
