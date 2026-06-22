/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { PredictionRunDto } from "../dtos";

export const getPredictionRuns = (versionId: string): Promise<PredictionRunDto[]> =>
  appFetch<PredictionRunDto[]>(`/api/schema-versions/${encodeURIComponent(versionId)}/runs`);
