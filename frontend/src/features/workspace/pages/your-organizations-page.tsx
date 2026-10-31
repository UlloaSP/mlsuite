import { Building2, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  useWorkspaceContext,
  useWorkspaceOrganizationCatalog,
} from "@/capabilities/workspace-context/workspace-context";
import { useSelectOrganization } from "@/features/workspace/api/workspace.mutations";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";

const newOrganizationLink = (
  <Link to="/workspace/organizations/create" viewTransition className={appButtonClass()}>
    <Plus size={16} /> New organization
  </Link>
);

/** The organizations the user belongs to; everyone else's stay out of sight. */
export function YourOrganizationsPage() {
  const navigate = useNavigate();
  const filters = useUrlFilters({ q: "" });
  const search = useDebouncedValue(filters.values.q.trim());
  const organizations = useWorkspaceOrganizationCatalog(search, "team");
  const currentId = useWorkspaceContext().data?.currentOrganization.id;
  const selectOrganization = useSelectOrganization();
  const items = organizations.data?.items ?? [];

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title="Organizations"
          description="Share models, schemas, plugins and inferences with other people."
          actions={newOrganizationLink}
        />
        <section className="flex min-h-0 flex-1 flex-col">
          <AppToolbar variant="flat">
            <AppSearchField
              className="min-w-[min(100%,260px)] flex-1"
              label="Search organizations"
              placeholder="Search by name or handle…"
              value={filters.values.q}
              onChange={(value) => filters.setFilters({ q: value })}
            />
          </AppToolbar>
          <CatalogListPanel
            hasNext={Boolean(organizations.hasNextPage)}
            onLoadMore={organizations.fetchNextPage}
            itemCount={items.length}
            isLoading={organizations.isLoading}
            isBusy={organizations.isFetching}
            loadingLabel="Loading organizations…"
            errorMessage={organizations.isError ? "Could not load organizations." : null}
            onRetry={() => {
              void (organizations.isFetchNextPageError
                ? organizations.fetchNextPage()
                : organizations.refetch());
            }}
            emptyState={{
              icon: <Building2 size={22} />,
              title: filters.isFiltered ? "No matching organizations" : "No organizations yet",
              description: filters.isFiltered
                ? "Try another name or handle."
                : "Your personal account works on its own. Create an organization when you want to work with other people.",
              action: filters.isFiltered ? undefined : newOrganizationLink,
            }}
          >
            {items.map((organization) => (
              <CatalogEntry
                key={organization.id}
                to={`/workspace/organizations/${organization.id}`}
                icon={
                  <OrganizationMark
                    className="size-10 rounded-lg"
                    fallbackClassName="bg-surface-muted text-fg-secondary"
                    iconSize={18}
                    logoUrl={organization.logoUrl}
                  />
                }
                title={organization.name}
                description={organization.description || organization.slug}
                actions={
                  organization.id === currentId ? null : (
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={selectOrganization.isPending}
                      onClick={() => {
                        void selectOrganization.mutateAsync(organization.id).then(() => {
                          void navigate("/home");
                        });
                      }}
                    >
                      Switch
                    </AppButton>
                  )
                }
              />
            ))}
          </CatalogListPanel>
        </section>
      </AppSurface>
    </AppPage>
  );
}
