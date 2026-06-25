/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  OrganizationsCatalogListPanel,
  type OrganizationsCatalogListPanelProps,
} from "./OrganizationsCatalogListPanel";
import {
  OrganizationsCatalogToolbar,
  type OrganizationsCatalogToolbarProps,
} from "./OrganizationsCatalogToolbar";

type OrganizationsCatalogBrowserProps = {
  list: OrganizationsCatalogListPanelProps;
  toolbar: OrganizationsCatalogToolbarProps;
};

export function OrganizationsCatalogBrowser({ list, toolbar }: OrganizationsCatalogBrowserProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded">
      <OrganizationsCatalogToolbar {...toolbar} />
      <OrganizationsCatalogListPanel {...list} />
    </section>
  );
}
