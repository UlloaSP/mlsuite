import { appFetch } from "@/shared/api/http";
import type { SearchResponseDto } from "@/shared/api/openapi.gen";

export const searchWorkspace = (query: string, signal?: AbortSignal): Promise<SearchResponseDto> =>
  appFetch<SearchResponseDto>(`/api/search?q=${encodeURIComponent(query)}`, { signal });
