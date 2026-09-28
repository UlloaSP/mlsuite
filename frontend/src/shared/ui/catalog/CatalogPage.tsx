/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import type { AppBreadcrumbItem } from "@/shared/ui/AppBreadcrumbs";
import type { BreadcrumbScope } from "@/shared/ui/breadcrumb/breadcrumb-context";
import {
  CatalogListPanel,
  type CatalogEmptyState,
  type CatalogListPanelProps,
} from "./CatalogListPanel";
import { CatalogToolbar, type CatalogToolbarProps } from "./CatalogToolbar";

type CatalogHeader = {
  actions?: ReactNode;
  breadcrumbs?: AppBreadcrumbItem[];
  breadcrumbScope?: BreadcrumbScope;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

type CatalogPageProps<TFilter extends string, TSort extends string> = {
  accessDenied?: boolean;
  accessFallback: ReactNode;
  children: ReactNode;
  emptyState: CatalogEmptyState;
  header: CatalogHeader;
  list: Omit<CatalogListPanelProps, "children" | "emptyState">;
  navigation?: ReactNode;
  toolbar: CatalogToolbarProps<TFilter, TSort>;
};

export function CatalogPage<TFilter extends string, TSort extends string>({
  accessDenied = false,
  accessFallback,
  children,
  emptyState,
  header,
  list,
  navigation,
  toolbar,
}: CatalogPageProps<TFilter, TSort>) {
  if (accessDenied) return accessFallback;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader {...header} />
        {navigation}
        <section className="flex min-h-0 flex-1 flex-col">
          <CatalogToolbar {...toolbar} />
          <CatalogListPanel {...list} emptyState={emptyState}>
            {children}
          </CatalogListPanel>
        </section>
      </AppSurface>
    </AppPage>
  );
}
