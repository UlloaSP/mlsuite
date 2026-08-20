import { appFetch } from "@/shared/api/http";
import type { SearchResponse } from "./search.types";

export const searchWorkspace = (query: string, signal?: AbortSignal): Promise<SearchResponse> =>
  appFetch<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`, { signal });
