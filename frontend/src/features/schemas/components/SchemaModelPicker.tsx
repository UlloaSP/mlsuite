/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { Link } from "react-router";
import type { SchemaSourceModel } from "@/features/schemas/lib/merge";
import { hasModelSchema } from "@/features/schemas/lib/schema-model-selection";
import { SchemaModelOption } from "./SchemaModelOption";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppTextField } from "@/shared/ui/AppTextField";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import type { CatalogPage } from "@/shared/api/infinite-catalog";
export type SchemaModelCatalog = {
  data?: CatalogPage<SchemaSourceModel>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
  isFetchNextPageError: boolean;
};
export function SchemaModelPicker({
  catalog,
  search,
  onSearchChange,
  value,
  onChange,
}: {
  catalog: SchemaModelCatalog;
  search: string;
  onSearchChange: (search: string) => void;
  value: SchemaSourceModel[];
  onChange: (value: SchemaSourceModel[]) => void;
}) {
  const selectedIds = new Set(value.map((item) => String(item.id)));
  const toggle = (model: SchemaSourceModel) => {
    if (!hasModelSchema(model)) return;
    onChange(
      selectedIds.has(String(model.id))
        ? value.filter((item) => String(item.id) !== String(model.id))
        : [...value, model],
    );
  };
  return (
    <section
      aria-label="Models"
      className="flex min-h-0 min-w-0 flex-col rounded-card border border-line bg-surface lg:flex-1"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-fg">Models</h2>
            <AppBadge tone={value.length ? "accent" : "neutral"}>{value.length} selected</AppBadge>
          </div>
          <p className="mt-0.5 text-xs text-fg-secondary">
            Each selected model contributes its inputs and reports to the schema.
          </p>
        </div>
        <AppTextField
          aria-label="Search models"
          className="w-full sm:w-64"
          placeholder="Search models"
          prefix={<Search className="size-4 text-fg-muted" />}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="flex min-h-60 flex-1 flex-col px-4 lg:min-h-0">
        <CatalogListPanel
          key={search}
          itemCount={catalog.data?.items.length ?? 0}
          hasNext={catalog.data?.hasNext ?? false}
          isLoading={catalog.isLoading}
          isBusy={catalog.isFetching}
          loadingLabel="Loading models…"
          errorMessage={catalog.error?.message ?? null}
          onLoadMore={() => catalog.fetchNextPage()}
          onRetry={() =>
            void (catalog.isFetchNextPageError ? catalog.fetchNextPage() : catalog.refetch())
          }
          emptyState={{
            title: search ? "No matching models" : "No models yet",
            description: search
              ? "Try another name or algorithm."
              : "Upload a model first; a schema is generated from its inputs.",
            action: search ? undefined : (
              <Link className={appButtonClass({ size: "sm" })} to="/models/create">
                Upload a model
              </Link>
            ),
          }}
        >
          {catalog.data?.items.map((model) => (
            <SchemaModelOption
              key={model.id}
              available={hasModelSchema(model)}
              model={model}
              selected={selectedIds.has(String(model.id))}
              onToggle={() => toggle(model)}
            />
          ))}
        </CatalogListPanel>
      </div>
    </section>
  );
}
