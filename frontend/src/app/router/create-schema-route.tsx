import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useQuery } from "@tanstack/react-query";
import { modelQueryOptions, useModelCatalogPageQuery } from "@/features/models/api/model.queries";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { CreateSchemaPage } from "@/features/schemas/pages/create-schema-page";
import { initialSchemaModels } from "@/features/schemas/lib/schema-model-selection";
const route = getRouteApi("/protected/app/can-edit-models/schemas/create");

export function CreateSchemaRoute() {
  const organizationId = useCurrentOrganizationId();
  const [search, setSearch] = useState("");
  const catalog = useModelCatalogPageQuery(
    organizationId,
    useDebouncedValue(search.trim()),
    "name",
    "active",
  );
  const modelId = route.useSearch({ select: (search) => search.modelId });
  // A link naming a model that is gone simply starts with nothing selected.
  const initial = useQuery({
    ...modelQueryOptions(organizationId ?? "none", modelId ?? ""),
    meta: { errorHandledLocally: true },
  });
  return (
    <CreateSchemaPage
      catalog={catalog}
      search={search}
      onSearchChange={setSearch}
      initialModels={initialSchemaModels(
        initial.data?.archivedAt === null ? [initial.data] : [],
        modelId ?? null,
      )}
      isLoading={Boolean(modelId) && initial.isLoading}
    />
  );
}
