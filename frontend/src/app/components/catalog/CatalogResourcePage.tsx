/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import type { AppBreadcrumbItem } from "../AppBreadcrumbs";
import { CatalogPage } from "./CatalogPage";
import type { CatalogOption } from "./CatalogToolbar";
import { getCatalogErrorMessage, getCatalogTotalPages } from "./catalogPageUtils";
import type { CatalogControls } from "./useCatalogControls";

type CatalogHeader = {
  actions?: ReactNode;
  breadcrumbs?: AppBreadcrumbItem[];
  description?: ReactNode;
  eyebrow?: ReactNode;
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
  pageSize: number;
  placeholder: string;
  query: CatalogQuery<TItem>;
  renderItem: (item: TItem, index: number) => ReactNode;
  sortLabel: string;
  sortOptions: Array<CatalogOption<TSort>>;
  toolbarChildren?: ReactNode;
} & CatalogEmptyCopy;

export function CatalogResourcePage<TItem, TFilter extends string, TSort extends string>({
  accessDenied,
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
  pageSize,
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

  return (
    <CatalogPage
      accessDenied={accessDenied}
      accessFallback={accessFallback}
      header={header}
      toolbar={{
        children: toolbarChildren,
        filter: controls.filter,
        filterLabel,
        filterVariant,
        filters,
        onFilterChange: controls.setFilter,
        onQueryChange: controls.setQuery,
        onSortChange: controls.setSort,
        placeholder,
        query: controls.query,
        resultCount: totalItems,
        sort: controls.sort,
        sortLabel,
        sortOptions,
      }}
      list={{
        errorMessage: getCatalogErrorMessage(query.error),
        hasNext: Boolean(query.data?.hasNext),
        isBusy,
        isLoading: query.isLoading,
        itemCount: items.length,
        layout,
        loadingLabel,
        page: controls.page,
        setPage: controls.setPage,
        totalPages: getCatalogTotalPages(totalItems, pageSize),
        onRetry: () => {
          void query.refetch();
        },
      }}
      emptyState={{
        action: hasActiveFilters ? undefined : emptyAction,
        description: hasActiveFilters ? filteredEmptyDescription : emptyDescription,
        icon: emptyIcon,
        title: hasActiveFilters ? filteredEmptyTitle : emptyTitle,
      }}
    >
      {items.map(renderItem)}
      {children}
    </CatalogPage>
  );
}
