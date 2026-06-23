/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SearchResponseDto } from "../dtos";

export const searchWorkspace = (query: string): Promise<SearchResponseDto> =>
  appFetch<SearchResponseDto>(`/api/search?q=${encodeURIComponent(query)}`);
