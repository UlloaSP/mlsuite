/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { CreatePredictionRunRequest, PredictionRunDto } from "@/api/schemas/dtos";

export const createPredictionRunForBookmark = (
  bookmarkId: string,
  req: CreatePredictionRunRequest,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(
    `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/runs`,
    json("POST", req),
  );
