/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { History } from "lucide-react";
import { AuditEventEntry } from "@/features/workspace/components/AuditEventEntry";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import type { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import type { AuditEventDto, PageDtoAuditEventDto } from "@/shared/api/openapi.gen";

/** The entries an audit catalog loaded, with its loading, failed and empty states. */
export function AuditEventList({
  log,
  isFiltered,
  emptyDescription,
  showOrganization = false,
}: {
  log: ReturnType<typeof useInfiniteCatalog<PageDtoAuditEventDto>>;
  isFiltered: boolean;
  emptyDescription: string;
  showOrganization?: boolean;
}) {
  const events: AuditEventDto[] = log.data?.items ?? [];
  return (
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
        title: isFiltered ? "No matching entries" : "Nothing recorded yet",
        description: isFiltered ? "Try other filters or another search term." : emptyDescription,
      }}
    >
      {events.map((event) => (
        <AuditEventEntry key={event.id} event={event} showOrganization={showOrganization} />
      ))}
    </CatalogListPanel>
  );
}
