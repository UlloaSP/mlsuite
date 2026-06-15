/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PluginCatalogListPanel, type PluginCatalogListPanelProps } from "./PluginCatalogListPanel";
import { PluginCatalogToolbar, type PluginCatalogToolbarProps } from "./PluginCatalogToolbar";

type PluginCatalogBrowserProps = {
  list: PluginCatalogListPanelProps;
  toolbar: PluginCatalogToolbarProps;
};

export function PluginCatalogBrowser({ list, toolbar }: PluginCatalogBrowserProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded">
      <PluginCatalogToolbar {...toolbar} />
      <PluginCatalogListPanel {...list} />
    </section>
  );
}
