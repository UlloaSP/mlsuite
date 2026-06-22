/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { PredictionRunDto, CreatePredictionRunRequest } from "../dtos";

export const createPredictionRun = (
  versionId: string,
  req: CreatePredictionRunRequest,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(
    `/api/schema-versions/${encodeURIComponent(versionId)}/runs`,
    json("POST", req),
  );
