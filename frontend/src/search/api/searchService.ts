import { appFetch } from "../../app/api/appFetch";
import type { SearchResponseDto } from "../types";

export const searchWorkspace = (query: string): Promise<SearchResponseDto> =>
  appFetch<SearchResponseDto>(`/api/search?q=${encodeURIComponent(query)}`);
