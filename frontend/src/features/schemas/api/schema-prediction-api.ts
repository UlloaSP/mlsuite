import { appFetch, json } from "@/shared/api/http";
import type {
  CreatedPredictionRunsDto,
  CreatePredictionRunRequest,
  CreatePredictionRunsRequest,
  PredictionResultFeedbackDto,
  PredictionResultFeedbackRevisionDto,
  PredictionRunDto,
} from "@/shared/api/openapi.gen";

export const createPredictionRunForBookmark = (
  bookmarkId: number | string,
  req: CreatePredictionRunRequest,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(
    `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/runs`,
    json("POST", req),
  );

/** Saves up to 100 runs of the bookmark in order, all or none. */
export const createPredictionRunsForBookmark = (
  bookmarkId: number | string,
  req: CreatePredictionRunsRequest,
): Promise<CreatedPredictionRunsDto> =>
  appFetch<CreatedPredictionRunsDto>(
    `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/runs/batch`,
    json("POST", req),
  );

export const getPredictionRun = (
  runId: number | string,
  signal?: AbortSignal,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(`/api/prediction-runs/${encodeURIComponent(runId)}`, { signal });

export const getPredictionResultFeedback = (
  resultId: number | string,
  signal?: AbortSignal,
): Promise<PredictionResultFeedbackDto[]> =>
  appFetch<PredictionResultFeedbackDto[]>(
    `/api/prediction-result-feedback?resultId=${encodeURIComponent(resultId)}`,
    { signal },
  );

/** Every change of every answer about the result, oldest first, including answers since removed. */
export const getPredictionResultFeedbackHistory = (
  resultId: number | string,
  signal?: AbortSignal,
): Promise<PredictionResultFeedbackRevisionDto[]> =>
  appFetch<PredictionResultFeedbackRevisionDto[]>(
    `/api/prediction-result-feedback/history?resultId=${encodeURIComponent(resultId)}`,
    { signal },
  );

export const getPredictionRunsFeedback = (
  runIds: readonly string[],
  signal?: AbortSignal,
): Promise<PredictionResultFeedbackDto[]> => {
  const params = new URLSearchParams({ runIds: runIds.join(",") });
  return appFetch<PredictionResultFeedbackDto[]>(
    `/api/prediction-result-feedback/by-runs?${params.toString()}`,
    { signal },
  );
};
