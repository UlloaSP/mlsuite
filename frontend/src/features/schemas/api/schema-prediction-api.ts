import { appFetch, json } from "@/shared/api/http";
import type {
  CreatePredictionRunRequest,
  PredictionResultFeedbackDto,
  PredictionRunDto,
  PredictionRunSequenceDto,
} from "@/shared/api/openapi.gen";

export const createPredictionRunForBookmark = (
  bookmarkId: number | string,
  req: CreatePredictionRunRequest,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(
    `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/runs`,
    json("POST", req),
  );

export const getPredictionRun = (
  runId: number | string,
  signal?: AbortSignal,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(`/api/prediction-runs/${encodeURIComponent(runId)}`, { signal });

export const getLastPredictionRunId = async (): Promise<number> => {
  const dto = await appFetch<PredictionRunSequenceDto>("/api/prediction-runs/last-id");
  return dto.lastId;
};

export const getPredictionResultFeedback = (
  resultId: number | string,
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
