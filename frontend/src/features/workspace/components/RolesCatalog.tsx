import { Search } from "lucide-react";
import { useSearchParams } from "react-router";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useClientCatalogPage } from "@/shared/ui/catalog/useClientCatalogPage";
import type {
  RoleDefinitionDto,
  RolesResponseDto,
  RoleTemplateDto,
} from "@/features/workspace/api/workspace.types";
import { RoleRow } from "./RoleRow";

export type RolesTab = "roles" | "templates" | "permissions";

export function RolesCatalog({
  organizationId,
  tab,
  data,
  loading,
  error,
  onRetry,
  canManage,
  onRole,
  onTemplate,
}: {
  organizationId: number;
  tab: "roles" | "templates";
  data: RolesResponseDto | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  canManage: boolean;
  onRole: (role: RoleDefinitionDto) => void;
  onTemplate: (template: RoleTemplateDto) => void;
}) {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const items =
    tab === "roles"
      ? (data?.roles ?? []).map((role) => ({
          key: String(role.id),
          text: `${role.name} ${role.description}`,
          content: <RoleRow role={role} onOpen={() => onRole(role)} />,
        }))
      : (data?.templates ?? []).map((template) => ({
          key: String(template.id),
          text: `${template.name} ${template.description}`,
          content: (
            <button
              type="button"
              disabled={!canManage}
              onClick={() => onTemplate(template)}
              className="h-full w-full rounded border border-[var(--border-soft)] p-4 text-left transition-colors enabled:hover:border-[var(--text-secondary)] disabled:cursor-default"
            >
              <p className="font-semibold">{template.name}</p>
              {template.description && template.description !== template.name ? (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{template.description}</p>
              ) : null}
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                {template.permissionKeys.length}{" "}
                {template.permissionKeys.length === 1 ? "permission" : "permissions"}
              </p>
            </button>
          ),
        }));
  const filtered = items.filter((item) =>
    item.text.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const pagination = useClientCatalogPage(
    filtered,
    `${organizationId}:${tab}:${search}`,
    loading || !data,
  );
  return (
    <>
      <AppToolbar variant="flat">
        <AppTextField
          className="w-full"
          aria-label={`Search ${tab}`}
          placeholder={`Search ${tab}...`}
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
      <CatalogListPanel
        {...pagination}
        itemCount={filtered.length}
        isLoading={loading}
        isBusy={loading}
        layout={tab === "roles" ? "list" : "grid"}
        loadingLabel={`Loading ${tab}...`}
        errorMessage={error ? `Could not load ${tab}.` : null}
        onRetry={onRetry}
        emptyState={{
          title: search ? `No matching ${tab}` : `No ${tab} yet`,
          description: search ? "Try another search." : "Available entries will appear here.",
        }}
      >
        {pagination.visibleItems.map((item) => (
          <div key={item.key}>{item.content}</div>
        ))}
      </CatalogListPanel>
    </>
  );
}
