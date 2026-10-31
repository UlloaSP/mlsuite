/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAuditEventCatalog } from "@/features/workspace/api/workspace-catalog-queries";
import { AuditEventList } from "@/features/workspace/components/AuditEventList";
import { AuditLogToolbar } from "@/features/workspace/components/AuditLogToolbar";
import { useAuditFilters } from "@/features/workspace/lib/use-audit-filters";

/** The organization's audit log, newest first; its search and filters live in the URL. */
export function AuditLog({ organizationId }: { organizationId: number }) {
  const filters = useAuditFilters();
  const log = useAuditEventCatalog(organizationId, filters.controls);

  return (
    <section aria-label="Audit log" className="flex min-h-0 flex-1 flex-col">
      <AuditLogToolbar filters={filters} totalItems={log.data?.totalItems} />
      <AuditEventList
        log={log}
        isFiltered={filters.isFiltered}
        emptyDescription="What people, API clients, public visitors and the system do in this organization appears here as it happens, and is kept for 7 days by default."
      />
    </section>
  );
}
