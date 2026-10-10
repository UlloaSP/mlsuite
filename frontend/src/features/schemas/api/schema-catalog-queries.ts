import { useQuery } from "@tanstack/react-query";
import { SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY } from "./schema-keys";
import type { SchemaBookmarkExampleDto, BookmarkExampleStateDto } from "@/shared/api/openapi.gen";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { appFetch } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  PredictBookmarkDto,
  SchemaVersionDto,
  SchemaBookmarkDto,
  SchemaChangeCatalogItemDto,
} from "@/shared/api/openapi.gen";
import {
  SCHEMA_VERSIONS_QUERY_KEY,
  SCHEMA_DRAFTS_QUERY_KEY,
  SCHEMA_BOOKMARKS_QUERY_KEY,
  ORGANIZATION_BOOKMARKS_QUERY_KEY,
} from "./schema-keys";

type Controls = { search: string; filter: string; sort: string };

function useRepositoryCatalog<T>(
  resource: "versions" | "drafts" | "bookmarks",
  schemaId: string | undefined,
  controls: Controls,
  itemId?: (item: T) => unknown,
) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const key =
    resource === "versions"
      ? SCHEMA_VERSIONS_QUERY_KEY
      : resource === "drafts"
        ? SCHEMA_DRAFTS_QUERY_KEY
        : SCHEMA_BOOKMARKS_QUERY_KEY;
  return useInfiniteCatalog<CatalogPage<T>>({
    queryKey: [...key(organizationId, schemaId ?? ""), "infinite", controls],
    itemId,
    queryFn: (page, signal) => {
      const params = new URLSearchParams({ page: String(page), size: "24", ...controls });
      return appFetch<CatalogPage<T>>(`/api/schemas/${schemaId}/${resource}/catalog?${params}`, {
        signal,
      });
    },
    enabled: Boolean(schemaId),
  });
}

export const useSnapshotCatalog = (schemaId: string | undefined, controls: Controls) =>
  useRepositoryCatalog<SchemaVersionDto>("versions", schemaId, controls);
export const useChangeCatalog = (schemaId: string | undefined, controls: Controls) =>
  useRepositoryCatalog<
    Omit<SchemaChangeCatalogItemDto, "draft"> & { draft: import("./draft-types").SchemaDraftDto }
  >("drafts", schemaId, controls, (item) => item.draft.id);
export const useBookmarkCatalog = (schemaId: string | undefined, controls: Controls) =>
  useRepositoryCatalog<SchemaBookmarkDto>("bookmarks", schemaId, controls);

export function usePredictCatalog(controls: Controls) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useInfiniteCatalog({
    queryKey: [...ORGANIZATION_BOOKMARKS_QUERY_KEY(organizationId), "infinite", controls],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<PredictBookmarkDto>>(
        `/api/schema-bookmarks/catalog?${new URLSearchParams({ page: String(page), size: "24", ...controls })}`,
        { signal },
      ),
    enabled: organizationId !== "none",
  });
}

export function useBookmarkExampleCatalog(bookmarkId: number, enabled: boolean) {
  const org = useCurrentOrganizationId() ?? "none";
  return useInfiniteCatalog<CatalogPage<SchemaBookmarkExampleDto>>({
    queryKey: [...SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY(org, bookmarkId), "infinite"],
    itemId: (item) => item.runId,
    queryFn: (page, signal) =>
      appFetch<CatalogPage<SchemaBookmarkExampleDto>>(
        `/api/schema-bookmarks/${bookmarkId}/examples/catalog?page=${page}&size=24`,
        { signal },
      ),
    enabled,
  });
}
export function useBookmarkExampleState(bookmarkId: number | undefined, runId: number) {
  const org = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: [...SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY(org, bookmarkId ?? ""), "state", runId],
    queryFn: ({ signal }) =>
      appFetch<BookmarkExampleStateDto>(
        `/api/schema-bookmarks/${bookmarkId}/examples/${runId}/status`,
        { signal },
      ),
    enabled: Boolean(bookmarkId),
  });
}
export function useBookmarkStatistics(bookmarkId: string) {
  const org = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: [...ORGANIZATION_BOOKMARKS_QUERY_KEY(org), "statistics", bookmarkId],
    queryFn: ({ signal }) =>
      appFetch<PredictBookmarkDto>(`/api/schema-bookmarks/${bookmarkId}/statistics`, { signal }),
    // The count is optional decoration: the workspace itself reports a missing bookmark.
    meta: { errorHandledLocally: true },
    enabled: Boolean(bookmarkId),
  });
}
