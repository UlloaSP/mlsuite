import { useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { appFetch, json } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  InferenceCatalogMetadataDto,
  InferenceCatalogRequest,
  InferenceCatalogRowDto,
  PredictionRunCatalogItemDto,
} from "@/shared/api/openapi.gen";
import type { InferenceFilters } from "@/features/inferences/lib/inference-filter";
import { INFERENCES_QUERY_KEY } from "./inference-api";

export function inferenceRequest(
  filters: InferenceFilters,
  sort = "createdAt.desc",
): InferenceCatalogRequest {
  return { ...filters, page: 0, size: 50, sort, locale: navigator.language };
}

export function useInferenceCatalogPage(filters: InferenceFilters, sort: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const request = inferenceRequest(filters, sort);
  return useInfiniteCatalog<CatalogPage<InferenceCatalogRowDto>>({
    queryKey: [...INFERENCES_QUERY_KEY(organizationId), "infinite", request],
    itemId: (row) => row.item.id,
    queryFn: (page, signal) =>
      appFetch<CatalogPage<InferenceCatalogRowDto>>("/api/prediction-runs/catalog", {
        ...json("POST", { ...request, page }),
        signal,
      }),
    enabled: organizationId !== "none",
  });
}

export function useInferenceCatalogMetadata(schemaId: string, bookmarkId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const request = { page: 0, size: 50, schemaId, bookmarkId, locale: navigator.language };
  return useQuery({
    queryKey: [...INFERENCES_QUERY_KEY(organizationId), "metadata", request],
    queryFn: ({ signal }) =>
      appFetch<InferenceCatalogMetadataDto>("/api/prediction-runs/catalog/metadata", {
        ...json("POST", request),
        signal,
      }),
    // A new schema or bookmark scope keeps this organization's previous columns until its own
    // arrive, so the table is not torn down between two scopes.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === organizationId ? previous : undefined,
    enabled: organizationId !== "none",
  });
}

export function useInferenceSelection(filters: InferenceFilters, sort: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const request = inferenceRequest(filters, sort);
  return useQuery({
    queryKey: [...INFERENCES_QUERY_KEY(organizationId), "selection", request],
    queryFn: ({ signal }) =>
      appFetch<PredictionRunCatalogItemDto[]>("/api/prediction-runs/catalog/selection", {
        ...json("POST", request),
        signal,
      }),
    enabled: false,
  });
}

export function useInferenceFacetCatalog(
  kind: "schemas" | "bookmarks" | "columns",
  schemaId: string,
  bookmarkId: string,
  search: string,
) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useInfiniteCatalog<CatalogPage<InferenceCatalogMetadataDto["schemas"][number]>>({
    queryKey: [
      ...INFERENCES_QUERY_KEY(organizationId),
      "facets",
      kind,
      schemaId,
      bookmarkId,
      "infinite",
      search,
    ],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<InferenceCatalogMetadataDto["schemas"][number]>>(
        "/api/prediction-runs/catalog/facets",
        {
          ...json("POST", {
            kind,
            search,
            page,
            size: 24,
            scope: { schemaId, bookmarkId, locale: navigator.language },
          }),
          signal,
        },
      ),
    itemId: (item) => item.value,
    enabled: organizationId !== "none",
  });
}
