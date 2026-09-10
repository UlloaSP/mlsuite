import { KeyRound, Search } from "lucide-react";
import { useSearchParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import type { PermissionGroupDto } from "@/features/workspace/api/workspace.types";

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
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
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
    <>
      <AppToolbar variant="flat">
        <AppTextField
          className="w-full"
          aria-label="Search permissions"
          placeholder="Search permissions..."
          prefix={<Search className="size-4 text-[var(--text-muted)]" />}
          value={search}
          onChange={(event) =>
            setParams(
              (current) => {
                const next = new URLSearchParams(current);
                if (event.target.value) next.set("q", event.target.value);
                else next.delete("q");
                next.delete("page");
                return next;
              },
              { replace: true },
            )
          }
        />
      </AppToolbar>
      <section
        aria-label="Permission groups"
        className="app-scroll min-h-0 flex-1 basis-0 overflow-y-auto py-4"
      >
        {loading ? (
          <p>Loading permissions...</p>
        ) : error ? (
          <div className="space-y-3">
            <p role="alert">Could not load permissions.</p>
            <AppButton variant="secondary" onClick={onRetry}>
              Retry
            </AppButton>
          </div>
        ) : filtered.length === 0 ? (
          <AppEmptyState
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
    </>
  );
}
