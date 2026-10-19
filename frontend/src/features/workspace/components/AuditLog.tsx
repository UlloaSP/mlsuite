/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { History } from "lucide-react";
import { useAuditEventCatalog } from "@/features/workspace/api/workspace-catalog-queries";
import { AuditEventEntry } from "@/features/workspace/components/AuditEventEntry";
import { AUDIT_ACTIONS } from "@/features/workspace/lib/audit-actions";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  ...Object.entries(AUDIT_ACTIONS).map(([value, { label }]) => ({ value, label })),
];

/**
 * The organization's audit log, newest first, searched by actor, target id or recorded details
 * and filtered by action. Search and action live in the URL.
 */
export function AuditLog({ organizationId }: { organizationId: number }) {
  const filters = useUrlFilters({ q: "", action: "all" });
  const { q: query, action } = filters.values;
  const search = useDebouncedValue(query.trim());
  const log = useAuditEventCatalog(organizationId, { search, filter: action });
  const events = log.data?.items ?? [];

  return (
    <section aria-label="Audit log" className="flex min-h-0 flex-1 flex-col">
      <AppToolbar variant="flat">
        <AppSearchField
          className="min-w-[min(100%,260px)] flex-1"
          label="Search the audit log"
          placeholder="Search by person, target id or details…"
          count={
            log.isSuccess
              ? {
                  shown: log.data.totalItems,
                  total: log.data.totalItems,
                  filtered: false,
                  noun: log.data.totalItems === 1 ? "entry" : "entries",
                }
              : undefined
          }
          value={query}
          onChange={(value) => filters.setFilters({ q: value })}
        />
        <AppSelect
          aria-label="Filter by action"
          className="w-full sm:w-64"
          options={ACTION_OPTIONS}
          value={action}
          onValueChange={(value) => filters.setFilters({ action: value })}
        />
      </AppToolbar>
      <CatalogListPanel
        hasNext={Boolean(log.hasNextPage)}
        onLoadMore={log.fetchNextPage}
        itemCount={events.length}
        isLoading={log.isLoading}
        isBusy={log.isLoading || log.isFetching}
        loadingLabel="Loading the audit log…"
        errorMessage={log.isError ? "Could not load the audit log." : null}
        onRetry={() => void (log.isFetchNextPageError ? log.fetchNextPage() : log.refetch())}
        emptyState={{
          icon: <History size={22} />,
          title: filters.isFiltered ? "No matching entries" : "Nothing recorded yet",
          description: filters.isFiltered
            ? "Try another action or search term."
            : "Changes to invitations, roles and API access appear here as they are made.",
        }}
      >
        {events.map((event) => (
          <AuditEventEntry key={event.id} event={event} />
        ))}
      </CatalogListPanel>
    </section>
  );
}
