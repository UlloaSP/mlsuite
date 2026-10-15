/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ScrollText } from "lucide-react";
import { useApiRequestCatalog } from "@/features/api-access/api/api-access.queries";
import { RequestEntry } from "@/features/api-access/components/RequestEntry";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { CatalogToolbar } from "@/shared/ui/catalog/CatalogToolbar";
import { getCatalogErrorMessage } from "@/shared/ui/catalog/catalogPageUtils";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";

const PAGE_SIZE = 50;

export type RequestOutcome = "all" | "succeeded" | "rejected" | "failed" | "errors";

const OUTCOMES: Array<{ value: RequestOutcome; label: string }> = [
  { value: "all", label: "All" },
  { value: "succeeded", label: "Succeeded" },
  { value: "errors", label: "Errors" },
  { value: "rejected", label: "Refused" },
  { value: "failed", label: "Failed" },
];

const SORTS = [{ value: "newest", label: "Newest first" }] as const;

/**
 * The organization's request log, or one client's: every call made with a valid key, newest
 * first, searched by request id, client, bookmark or problem code. Outcome and search live in
 * the URL.
 */
export function RequestLog({ clientId }: { clientId?: number }) {
  const controls = useCatalogControls<RequestOutcome, "newest">({
    filters: OUTCOMES.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "newest",
    sorts: ["newest"],
  });
  const query = useApiRequestCatalog(
    { size: PAGE_SIZE, search: controls.search, filter: controls.filter },
    clientId,
  );
  const items = query.data?.items ?? [];
  const filtered = Boolean(controls.search) || controls.filter !== "all";

  return (
    <section aria-label="Request log" className="flex min-h-0 flex-1 flex-col">
      <CatalogToolbar
        filter={controls.filter}
        filterLabel="Filter calls by outcome"
        filters={OUTCOMES}
        onFilterChange={controls.setFilter}
        onQueryChange={controls.setQuery}
        onSortChange={controls.setSort}
        placeholder="Search by request id, client, bookmark or code"
        query={controls.query}
        resultCount={query.data?.totalItems ?? 0}
        sort={controls.sort}
        sortLabel="Order calls"
        sortOptions={[...SORTS]}
      />
      <CatalogListPanel
        key={`${controls.search}:${controls.filter}`}
        errorMessage={getCatalogErrorMessage(query.error)}
        hasNext={Boolean(query.data?.hasNext)}
        isBusy={query.isLoading || query.isFetching}
        isLoading={query.isLoading}
        itemCount={items.length}
        loadingLabel="Loading calls…"
        onLoadMore={query.fetchNextPage}
        onRetry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
        emptyState={{
          icon: <ScrollText size={22} />,
          title: filtered ? "No matching calls" : "No calls yet",
          description: filtered
            ? "Try another outcome or search term."
            : "Calls appear here as soon as a client makes one with a valid key.",
        }}
      >
        {items.map((item) => (
          <RequestEntry key={item.requestId} request={item} />
        ))}
      </CatalogListPanel>
    </section>
  );
}
