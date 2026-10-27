/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type {
  CreatePredictionJobRequest,
  PredictionJobDto,
  PredictionJobFailureDto,
} from "@/shared/api/openapi.gen";

export const startPredictionJob = (
  bookmarkId: number | string,
  request: CreatePredictionJobRequest,
): Promise<PredictionJobDto> =>
  appFetch<PredictionJobDto>(
    `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/prediction-jobs`,
    json("POST", request),
  );

export const getPredictionJobs = (
  bookmarkId: number | string,
  signal?: AbortSignal,
): Promise<PredictionJobDto[]> =>
  appFetch<PredictionJobDto[]>(
    `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/prediction-jobs`,
    { signal },
  );

export const getPredictionJobFailures = (
  jobId: number,
  signal?: AbortSignal,
): Promise<PredictionJobFailureDto[]> =>
  appFetch<PredictionJobFailureDto[]>(`/api/prediction-jobs/${jobId}/failures`, { signal });

export const cancelPredictionJob = (jobId: number): Promise<PredictionJobDto> =>
  appFetch<PredictionJobDto>(`/api/prediction-jobs/${jobId}/cancel`, { method: "POST" });

export const retryPredictionJob = (jobId: number): Promise<PredictionJobDto> =>
  appFetch<PredictionJobDto>(`/api/prediction-jobs/${jobId}/retry`, { method: "POST" });
