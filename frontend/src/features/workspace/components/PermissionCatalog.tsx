import { KeyRound } from "lucide-react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import type { PermissionGroupDto } from "@/features/workspace/api/workspace.types";
import { useStableLoading } from "@/shared/ui/useStableLoading";

export function PermissionCatalog({
  groups,
  loading,
  error,
  onRetry,
}: {
  groups: PermissionGroupDto[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const filters = useUrlFilters({ q: "" });
  const showLoading = useStableLoading(loading);
  const search = filters.values.q;
  const query = search.trim().toLowerCase();
  const filtered = groups
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) =>
        `${group.name} ${permission.label} ${permission.description}`.toLowerCase().includes(query),
      ),
    }))
    .filter((group) => group.permissions.length > 0);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppToolbar variant="flat">
        <AppSearchField
          label="Search permissions"
          placeholder="Search permissions…"
          value={search}
          onChange={(value) => filters.setFilters({ q: value })}
        />
      </AppToolbar>
      <section
        aria-label="Permission groups"
        className="app-scroll min-h-0 flex-1 basis-0 overflow-y-auto py-4"
      >
        {showLoading ? (
          <AppLoadingState compact label="Loading permissions…" />
        ) : error ? (
          <div className="flex flex-col items-start gap-3">
            <AppInlineAlert>Could not load permissions.</AppInlineAlert>
            <AppButton size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </AppButton>
          </div>
        ) : filtered.length === 0 ? (
          <AppEmptyState
            compact
            title={search ? "No matching permissions" : "No permissions yet"}
            description={search ? "Try another search." : "Available permissions will appear here."}
          />
        ) : (
          <div className="grid gap-4 pr-1 md:grid-cols-2">
            {filtered.map((group) => (
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
          </div>
        )}
      </section>
    </div>
  );
}
