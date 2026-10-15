/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useApiClientCatalog } from "@/features/api-access/api/api-access.queries";
import { ApiClientEntry } from "@/features/api-access/components/ApiClientEntry";
import { CreateApiClientButton } from "@/features/api-access/components/CreateApiClientButton";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { SECTION_ICONS } from "@/shared/ui/section-icons";

const PAGE_SIZE = 24;
type Filter = "all" | "active" | "suspended";
type Sort = "updated" | "name" | "created";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "name", label: "Name" },
  { value: "created", label: "Newest" },
];

const ClientsIcon = SECTION_ICONS.api;

/** The organization's API clients: outside software that runs its bookmarks with keys. */
export function ApiClientsPage() {
  const canManage = useCan("canManageApiAccess");
  const controls = useCatalogControls<Filter, Sort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "updated",
    sorts: SORTS.map(({ value }) => value),
  });
  const query = useApiClientCatalog({
    size: PAGE_SIZE,
    search: controls.search,
    filter: controls.filter,
    sort: controls.sort,
  });

  return (
    <CatalogResourcePage
      accessFallback={<NotFoundError />}
      controls={controls}
      header={{
        title: "Clients",
        description: "Outside software that runs this organization's bookmarks with its own keys.",
        breadcrumbs: [{ label: "API", to: "/api-access" }, { label: "Clients" }],
        actions: canManage ? <CreateApiClientButton /> : undefined,
      }}
      loadingLabel="Loading clients…"
      filterLabel="Filter clients"
      filters={FILTERS}
      placeholder="Search by name or description"
      query={query}
      sortLabel="Sort clients"
      sortOptions={SORTS}
      emptyIcon={<ClientsIcon size={22} />}
      emptyTitle="No clients yet"
      filteredEmptyTitle="No matching clients"
      emptyDescription={
        canManage
          ? "Create one for each piece of outside software that should run your models."
          : "Members who manage API access create clients for outside software."
      }
      filteredEmptyDescription="Try another filter or search term."
      renderItem={(client) => <ApiClientEntry key={client.id} client={client} />}
    />
  );
}
