/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  SchemasCatalogListPanel,
  type SchemasCatalogListPanelProps,
} from "./SchemasCatalogListPanel";
import { SchemasCatalogToolbar, type SchemasCatalogToolbarProps } from "./SchemasCatalogToolbar";

type SchemasCatalogBrowserProps = {
  list: SchemasCatalogListPanelProps;
  toolbar: SchemasCatalogToolbarProps;
};

export function SchemasCatalogBrowser({ list, toolbar }: SchemasCatalogBrowserProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded">
      <SchemasCatalogToolbar {...toolbar} />
      <SchemasCatalogListPanel {...list} />
    </section>
  );
}
