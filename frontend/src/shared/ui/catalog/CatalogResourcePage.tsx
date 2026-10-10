/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import type { AppBreadcrumbItem } from "@/shared/ui/AppBreadcrumbs";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { CatalogListPanel } from "./CatalogListPanel";
import { CatalogToolbar, type CatalogOption } from "./CatalogToolbar";
import { getCatalogErrorMessage } from "./catalogPageUtils";
import type { CatalogControls } from "./useCatalogControls";

type CatalogHeader = {
  actions?: ReactNode;
  breadcrumbs?: AppBreadcrumbItem[];
  description?: ReactNode;
  title: ReactNode;
};

type CatalogPageResult<TItem> = {
  hasNext: boolean;
  items: TItem[];
  totalItems: number;
};

type CatalogQuery<TItem> = {
  data?: CatalogPageResult<TItem>;
  error: unknown;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => unknown;
  fetchNextPage: () => unknown;
  isFetchNextPageError: boolean;
};

type CatalogEmptyCopy = {
  emptyAction?: ReactNode;
  emptyDescription: ReactNode;
  emptyIcon?: ReactNode;
  emptyTitle: string;
  filteredEmptyDescription: ReactNode;
  filteredEmptyTitle: string;
};

type CatalogResourcePageProps<TItem, TFilter extends string, TSort extends string> = {
  accessDenied?: boolean;
  accessFallback: ReactNode;
  children?: ReactNode;
  controls: CatalogControls<TFilter, TSort>;
  filterLabel: string;
  filterVariant?: "buttons" | "segmented";
  filters: Array<CatalogOption<TFilter>>;
  header: CatalogHeader;
  isActionPending?: boolean;
  layout?: "grid" | "list";
  loadingLabel: string;
  navigation?: ReactNode;
  placeholder: string;
  query: CatalogQuery<TItem>;
  renderItem: (item: TItem, index: number) => ReactNode;
  sortLabel: string;
  sortOptions: Array<CatalogOption<TSort>>;
  toolbarChildren?: ReactNode;
} & CatalogEmptyCopy;

export function CatalogResourcePage<TItem, TFilter extends string, TSort extends string>({
  accessDenied = false,
  accessFallback,
  children,
  controls,
  emptyAction,
  emptyDescription,
  emptyIcon,
  emptyTitle,
  filteredEmptyDescription,
  filteredEmptyTitle,
  filterLabel,
  filterVariant,
  filters,
  header,
  isActionPending = false,
  layout,
  loadingLabel,
  navigation,
  placeholder,
  query,
  renderItem,
  sortLabel,
  sortOptions,
  toolbarChildren,
}: CatalogResourcePageProps<TItem, TFilter, TSort>) {
  const items = query.data?.items ?? [];
  const totalItems = query.data?.totalItems ?? 0;
  const hasActiveFilters = Boolean(controls.search) || controls.filter !== filters[0]?.value;
  const isBusy = query.isLoading || query.isFetching || isActionPending;

  if (accessDenied) return accessFallback;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader {...header} />
        {navigation}
        <section className="flex min-h-0 flex-1 flex-col">
          <CatalogToolbar
            filter={controls.filter}
            filterLabel={filterLabel}
            filterVariant={filterVariant}
            filters={filters}
            onFilterChange={controls.setFilter}
            onQueryChange={controls.setQuery}
            onSortChange={controls.setSort}
            placeholder={placeholder}
            query={controls.query}
            resultCount={totalItems}
            sort={controls.sort}
            sortLabel={sortLabel}
            sortOptions={sortOptions}
          >
            {toolbarChildren}
          </CatalogToolbar>
          <CatalogListPanel
            key={`${controls.search}:${controls.filter}:${controls.sort}`}
            errorMessage={getCatalogErrorMessage(query.error)}
            hasNext={Boolean(query.data?.hasNext)}
            isBusy={isBusy}
            isLoading={query.isLoading}
            itemCount={items.length}
            layout={layout}
            loadingLabel={loadingLabel}
            onLoadMore={query.fetchNextPage}
            onRetry={() => {
              void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch());
            }}
            emptyState={{
              action: hasActiveFilters ? undefined : emptyAction,
              description: hasActiveFilters ? filteredEmptyDescription : emptyDescription,
              icon: emptyIcon,
              title: hasActiveFilters ? filteredEmptyTitle : emptyTitle,
            }}
          >
            {items.map(renderItem)}
          </CatalogListPanel>
        </section>
        {children}
      </AppSurface>
    </AppPage>
  );
}
