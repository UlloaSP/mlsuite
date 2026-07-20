import { appFetch, json } from "@/shared/api/http";
import type {
  CreatePredictionResultFeedbackRequest,
  CreatePredictionRunRequest,
  PredictionResultFeedbackDto,
  PredictionRunDto,
  UpdatePredictionResultFeedbackRequest,
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

export const getPredictionRunsForBookmark = (
  bookmarkId: string,
  signal?: AbortSignal,
): Promise<PredictionRunDto[]> =>
  appFetch<PredictionRunDto[]>(`/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/runs`, {
    signal,
  });

export const getLastPredictionRunId = async (): Promise<number> => {
  const dto = await appFetch<{ lastId: number }>("/api/prediction-runs/last-id");
  return Number(dto.lastId ?? 0);
};

export const createPredictionResultFeedback = (
  req: CreatePredictionResultFeedbackRequest,
): Promise<PredictionResultFeedbackDto> =>
  appFetch<PredictionResultFeedbackDto>("/api/prediction-result-feedback", json("POST", req));

export const updatePredictionResultFeedback = (
  req: UpdatePredictionResultFeedbackRequest,
): Promise<PredictionResultFeedbackDto> =>
  appFetch<PredictionResultFeedbackDto>("/api/prediction-result-feedback", json("PATCH", req));

export const getPredictionResultFeedback = (
  resultId: string,
  signal?: AbortSignal,
): Promise<PredictionResultFeedbackDto[]> =>
  appFetch<PredictionResultFeedbackDto[]>(
    `/api/prediction-result-feedback?resultId=${encodeURIComponent(resultId)}`,
    { signal },
  );
