/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { getModelAlgorithmLabel } from "@/capabilities/prediction-runtime/data/model-utils";
import type { SchemaSourceModel } from "@/features/schemas/lib/merge";
import { hasModelSchema } from "@/features/schemas/lib/schema-model-selection";
import { SchemaModelOption } from "@/features/schemas/components/SchemaModelOption";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppTextField } from "@/shared/ui/AppTextField";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogPaginationFooter } from "@/shared/ui/catalog/CatalogPaginationFooter";
import { useClientCatalogPage } from "@/shared/ui/catalog/useClientCatalogPage";
import { useStableLoading } from "@/shared/ui/useStableLoading";

type Props = {
  isLoading: boolean;
  models: SchemaSourceModel[];
  value: SchemaSourceModel[];
  onChange: (value: SchemaSourceModel[]) => void;
};

const matches = (model: SchemaSourceModel, query: string) =>
  `${model.name} ${getModelAlgorithmLabel(model)}`.toLowerCase().includes(query);

/** Searchable, paginated model list; the selection lives in the page, so it survives paging. */
export function SchemaModelPicker({ isLoading, models, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (normalized ? models.filter((model) => matches(model, normalized)) : models),
    [models, normalized],
  );
  const pagination = useClientCatalogPage(filtered, normalized, isLoading);
  const showLoading = useStableLoading(isLoading);
  const selectedIds = new Set(value.map((item) => String(item.id)));

  const toggle = (model: SchemaSourceModel) => {
    if (!hasModelSchema(model)) return;
    if (selectedIds.has(String(model.id))) {
      onChange(value.filter((item) => String(item.id) !== String(model.id)));
      return;
    }
    onChange([...value, model]);
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
            <AppBadge tone={value.length > 0 ? "accent" : "neutral"}>
              {value.length} selected
            </AppBadge>
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
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="app-scroll flex min-h-60 flex-1 flex-col gap-2 overflow-y-auto p-4 lg:min-h-0">
        {showLoading ? (
          <AppLoadingState compact label="Loading models…" rows={4} />
        ) : models.length === 0 ? (
          <AppEmptyState
            compact
            title="No models yet"
            description="Upload a model first; a schema is generated from its inputs."
            action={
              <Link className={appButtonClass({ size: "sm" })} to="/models/create">
                Upload a model
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <AppEmptyState
            compact
            title="No matching models"
            description="Try another name or algorithm."
          />
        ) : (
          pagination.visibleItems.map((model) => (
            <SchemaModelOption
              key={model.id}
              available={hasModelSchema(model)}
              model={model}
              selected={selectedIds.has(String(model.id))}
              onToggle={() => toggle(model)}
            />
          ))
        )}
      </div>

      <div className="shrink-0 px-4 pb-4">
        <CatalogPaginationFooter
          disabled={isLoading}
          hasNext={pagination.hasNext}
          page={pagination.page}
          setPage={pagination.setPage}
          totalPages={pagination.totalPages}
        />
      </div>
    </section>
  );
}
