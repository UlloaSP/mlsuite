/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ModelsCatalogListPanel, type ModelsCatalogListPanelProps } from "./ModelsCatalogListPanel";
import { ModelsCatalogToolbar, type ModelsCatalogToolbarProps } from "./ModelsCatalogToolbar";

type ModelsCatalogBrowserProps = {
  list: ModelsCatalogListPanelProps;
  toolbar: ModelsCatalogToolbarProps;
};

export function ModelsCatalogBrowser({ list, toolbar }: ModelsCatalogBrowserProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded">
      <ModelsCatalogToolbar {...toolbar} />
      <ModelsCatalogListPanel {...list} />
    </section>
  );
}
