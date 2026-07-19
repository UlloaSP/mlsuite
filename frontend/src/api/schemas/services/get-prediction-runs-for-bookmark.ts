/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { PredictionRunDto } from "@/api/schemas/dtos";

export const getPredictionRunsForBookmark = (bookmarkId: string): Promise<PredictionRunDto[]> =>
  appFetch<PredictionRunDto[]>(`/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/runs`);
