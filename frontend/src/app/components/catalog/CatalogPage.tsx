/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

import { AppPage } from "../AppPage";
import { AppSurface } from "../AppSurface";
import { AppPageHeader } from "../PageHeader";
import type { AppBreadcrumbItem } from "../AppBreadcrumbs";
import {
  CatalogListPanel,
  type CatalogEmptyState,
  type CatalogListPanelProps,
} from "./CatalogListPanel";
import { CatalogToolbar, type CatalogToolbarProps } from "./CatalogToolbar";

type CatalogHeader = {
  actions?: ReactNode;
  breadcrumbs?: AppBreadcrumbItem[];
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

type CatalogPageProps<TFilter extends string, TSort extends string> = {
  accessDenied?: boolean;
  accessFallback: ReactNode;
  children: ReactNode;
  emptyState: CatalogEmptyState;
  emptyWrapperClassName?: string;
  header: CatalogHeader;
  list: Omit<CatalogListPanelProps, "children" | "emptyState" | "emptyWrapperClassName">;
  toolbar: CatalogToolbarProps<TFilter, TSort>;
};

export function CatalogPage<TFilter extends string, TSort extends string>({
  accessDenied = false,
  accessFallback,
  children,
  emptyState,
  emptyWrapperClassName,
  header,
  list,
  toolbar,
}: CatalogPageProps<TFilter, TSort>) {
  if (accessDenied) return accessFallback;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-hidden">
        <AppPageHeader {...header} />
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded">
          <CatalogToolbar {...toolbar} />
          <CatalogListPanel
            {...list}
            emptyState={emptyState}
            emptyWrapperClassName={emptyWrapperClassName}
          >
            {children}
          </CatalogListPanel>
        </section>
      </AppSurface>
    </AppPage>
  );
}
