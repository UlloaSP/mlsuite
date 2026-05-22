/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OutputFeedbackDto } from "./api/modelService";
import * as modelApi from "./api/modelService";

export const GET_OUTPUT_FEEDBACK_QUERY_KEY = (p: modelApi.GetOutputFeedbackRequest) =>
  ["getOutputFeedback", { predictionId: p.predictionId }] as const;

export const useGetOutputFeedback = ({ predictionId }: modelApi.GetOutputFeedbackRequest) =>
  useQuery({
    queryKey: GET_OUTPUT_FEEDBACK_QUERY_KEY({ predictionId }),
    queryFn: () => modelApi.getOutputFeedback({ predictionId }),
    enabled: Boolean(predictionId),
    placeholderData: [],
    gcTime: 10 * 60_000,
    retry: (count, err: any) => {
      const s = err?.status ?? err?.response?.status;
      if (s === 401 || s === 403) return false;
      return count < 2;
    },
  });

const CREATE_OUTPUT_FEEDBACK_QUERY_KEY = ["createOutputFeedback"] as const;

export function useCreateOutputFeedbackMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: CREATE_OUTPUT_FEEDBACK_QUERY_KEY,
    mutationFn: (data: modelApi.CreateOutputFeedbackRequest) => modelApi.createOutputFeedback(data),
    onSuccess: (outputFeedback: OutputFeedbackDto) => {
      qc.setQueryData<OutputFeedbackDto[]>(
        GET_OUTPUT_FEEDBACK_QUERY_KEY({ predictionId: outputFeedback.predictionId }),
        (prev) => (prev ? [...prev, outputFeedback] : [outputFeedback]),
      );
      qc.invalidateQueries({ queryKey: ["getOutputFeedback"] });
      qc.invalidateQueries({ queryKey: ["getTargets"] });
      qc.invalidateQueries({ queryKey: ["getPredictions"] });
    },
  });
}

const UPDATE_OUTPUT_FEEDBACK_QUERY_KEY = ["updateOutputFeedback"] as const;

export function useUpdateOutputFeedbackMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: UPDATE_OUTPUT_FEEDBACK_QUERY_KEY,
    mutationFn: (data: modelApi.UpdateOutputFeedbackRequest) => modelApi.updateOutputFeedback(data),
    onSuccess: (outputFeedback: OutputFeedbackDto) => {
      qc.setQueryData<OutputFeedbackDto[]>(
        GET_OUTPUT_FEEDBACK_QUERY_KEY({ predictionId: outputFeedback.predictionId }),
        (prev) =>
          prev
            ? prev.map((item) => (item.id === outputFeedback.id ? outputFeedback : item))
            : [outputFeedback],
      );
      qc.invalidateQueries({ queryKey: ["getOutputFeedback"] });
      qc.invalidateQueries({ queryKey: ["getTargets"] });
      qc.invalidateQueries({ queryKey: ["getPredictions"] });
    },
  });
}
