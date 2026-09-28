import { Fragment } from "react";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
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
  const filters = useUrlFilters({ q: "" });
  const search = filters.values.q;
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
            <CatalogEntry
              title={template.name}
              description={
                template.description && template.description !== template.name
                  ? template.description
                  : undefined
              }
              details={`${template.permissionKeys.length} ${
                template.permissionKeys.length === 1 ? "permission" : "permissions"
              }`}
              onOpen={canManage ? () => onTemplate(template) : undefined}
            />
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
    <section className="flex min-h-0 flex-1 flex-col">
      <AppToolbar variant="flat">
        <AppSearchField
          label={`Search ${tab}`}
          placeholder={`Search ${tab}…`}
          value={search}
          onChange={(value) => filters.setFilters({ q: value })}
        />
      </AppToolbar>
      <CatalogListPanel
        {...pagination}
        itemCount={filtered.length}
        isLoading={loading}
        isBusy={loading}
        loadingLabel={`Loading ${tab}…`}
        errorMessage={error ? `Could not load ${tab}.` : null}
        onRetry={onRetry}
        emptyState={{
          title: search ? `No matching ${tab}` : `No ${tab} yet`,
          description: search ? "Try another search." : "Available entries will appear here.",
        }}
      >
        {pagination.visibleItems.map((item) => (
          <Fragment key={item.key}>{item.content}</Fragment>
        ))}
      </CatalogListPanel>
    </section>
  );
}
