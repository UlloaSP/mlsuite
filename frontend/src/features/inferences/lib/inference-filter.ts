import type {
  InferenceCatalogItemDto,
  InferenceStatus,
} from "@/features/inferences/api/inference-api";

export type InferenceFilters = {
  query: string;
  schemaId: string;
  bookmarkId: string;
  status: "all" | InferenceStatus;
};

export const filterInferences = (
  inferences: InferenceCatalogItemDto[],
  filters: InferenceFilters,
) => {
  const query = filters.query.trim().toLowerCase();
  return inferences.filter((inference) => {
    const matchesQuery =
      query.length === 0 ||
      [inference.name, inference.schemaName, inference.bookmarkName ?? "", String(inference.id)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesSchema =
      filters.schemaId === "all" || String(inference.schemaId) === filters.schemaId;
    const bookmarkValue =
      inference.bookmarkId == null ? "unbookmarked" : String(inference.bookmarkId);
    const matchesBookmark = filters.bookmarkId === "all" || bookmarkValue === filters.bookmarkId;
    const matchesStatus = filters.status === "all" || inference.status === filters.status;
    return matchesQuery && matchesSchema && matchesBookmark && matchesStatus;
  });
};
