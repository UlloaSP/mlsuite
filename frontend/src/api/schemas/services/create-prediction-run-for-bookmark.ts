/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { CreatePredictionRunRequest, PredictionRunDto } from "@/api/schemas/dtos";

export const createPredictionRunForBookmark = (
  bookmarkId: string,
  req: CreatePredictionRunRequest,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(
    `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/runs`,
    json("POST", req),
  );
