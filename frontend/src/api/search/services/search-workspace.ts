/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { SearchResponseDto } from "@/api/search/dtos";

export const searchWorkspace = (query: string, signal?: AbortSignal): Promise<SearchResponseDto> =>
  appFetch<SearchResponseDto>(`/api/search?q=${encodeURIComponent(query)}`, { signal });
