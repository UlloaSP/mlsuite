import { appFetch, json } from "@/shared/api/http";
import type {
  CreatePredictionRunRequest,
  PredictionResultFeedbackDto,
  PredictionRunDto,
} from "./prediction-types";

export const createPredictionRunForBookmark = (
  bookmarkId: string,
  req: CreatePredictionRunRequest,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(
    `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/runs`,
    json("POST", req),
  );

export const getPredictionRun = (runId: string, signal?: AbortSignal): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(`/api/prediction-runs/${encodeURIComponent(runId)}`, { signal });

export const getLastPredictionRunId = async (): Promise<number> => {
  const dto = await appFetch<{ lastId: number }>("/api/prediction-runs/last-id");
  return Number(dto.lastId ?? 0);
};

export const getPredictionResultFeedback = (
  resultId: string,
  signal?: AbortSignal,
): Promise<PredictionResultFeedbackDto[]> =>
  appFetch<PredictionResultFeedbackDto[]>(
    `/api/prediction-result-feedback?resultId=${encodeURIComponent(resultId)}`,
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
