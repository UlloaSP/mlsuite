import { KeyRound } from "lucide-react";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { usePermissionCatalog } from "@/features/workspace/api/workspace-catalog-queries";

export function PermissionCatalog({ organizationId }: { organizationId: number }) {
  const filters = useUrlFilters({ q: "" });
  const query = filters.values.q;
  const request = usePermissionCatalog(organizationId, useDebouncedValue(query.trim()));
  const groups = request.data?.items ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppToolbar variant="flat">
        <AppSearchField
          label="Search permissions"
          placeholder="Search permissions…"
          value={query}
          onChange={(value) => filters.setFilters({ q: value })}
        />
      </AppToolbar>
      <CatalogListPanel
        layout="grid"
        itemCount={groups.length}
        hasNext={Boolean(request.hasNextPage)}
        onLoadMore={request.fetchNextPage}
        isLoading={request.isLoading}
        isBusy={request.isFetching}
        loadingLabel="Loading permissions…"
        errorMessage={request.error ? "Could not load permissions." : null}
        onRetry={() =>
          void (request.isFetchNextPageError ? request.fetchNextPage() : request.refetch())
        }
        emptyState={{
          title: query ? "No matching permissions" : "No permissions yet",
          description: query ? "Try another search." : "Available permissions will appear here.",
        }}
      >
        {groups.map((group) => (
          <AppPanel variant="catalog" key={group.name}>
            <h2 className="mb-3 font-semibold">{group.name}</h2>
            <ul className="space-y-2">
              {group.permissions.map((permission) => (
                <li key={permission.key} className="flex items-center gap-2 text-sm">
                  <KeyRound className="size-4 shrink-0" />
                  {permission.label}
                </li>
              ))}
            </ul>
          </AppPanel>
        ))}
      </CatalogListPanel>
    </div>
  );
}
