import { Fragment } from "react";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import {
  useRoleCatalog,
  useRoleTemplateCatalog,
} from "@/features/workspace/api/workspace-catalog-queries";
import { RoleRow } from "./RoleRow";
import type { RoleDefinitionDto, RoleTemplateDto } from "@/shared/api/openapi.gen";

export type RolesTab = "roles" | "templates" | "permissions";

export function RolesCatalog({
  organizationId,
  tab,
  canManage,
  onRole,
  onTemplate,
}: {
  organizationId: number;
  tab: "roles" | "templates";
  canManage: boolean;
  onRole: (role: RoleDefinitionDto) => void;
  onTemplate: (template: RoleTemplateDto) => void;
}) {
  const filters = useUrlFilters({ q: "" });
  const query = filters.values.q;
  const search = useDebouncedValue(query.trim());
  const roles = useRoleCatalog(organizationId, search, tab === "roles");
  const templates = useRoleTemplateCatalog(organizationId, search, tab === "templates");
  const request = tab === "roles" ? roles : templates;
  const items =
    tab === "roles"
      ? (roles.data?.items ?? []).map((role) => ({
          key: String(role.id),
          content: <RoleRow role={role} onOpen={() => onRole(role)} />,
        }))
      : (templates.data?.items ?? []).map((template) => ({
          key: String(template.id),
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
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <AppToolbar variant="flat">
        <AppSearchField
          label={`Search ${tab}`}
          placeholder={`Search ${tab}…`}
          value={query}
          onChange={(value) => filters.setFilters({ q: value })}
        />
      </AppToolbar>
      <CatalogListPanel
        hasNext={Boolean(request.hasNextPage)}
        onLoadMore={request.fetchNextPage}
        itemCount={items.length}
        isLoading={request.isLoading}
        isBusy={request.isFetching}
        loadingLabel={`Loading ${tab}…`}
        errorMessage={request.error ? `Could not load ${tab}.` : null}
        onRetry={() =>
          void (request.isFetchNextPageError ? request.fetchNextPage() : request.refetch())
        }
        emptyState={{
          title: search ? `No matching ${tab}` : `No ${tab} yet`,
          description: search ? "Try another search." : "Available entries will appear here.",
        }}
      >
        {items.map((item) => (
          <Fragment key={item.key}>{item.content}</Fragment>
        ))}
      </CatalogListPanel>
    </section>
  );
}
