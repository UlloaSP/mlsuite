/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as modelApi from "../services";
import type { ModelDto } from "../dtos";
import { CREATE_MODEL_QUERY_KEY, GET_MODELS_QUERY_KEY } from "./query-keys";
import { useInvalidateModelQueries } from "./use-invalidate-model-queries";

export function useCreateModelMutation() {
  const qc = useQueryClient();
  const invalidate = useInvalidateModelQueries();
  return useMutation({
    mutationKey: CREATE_MODEL_QUERY_KEY,
    mutationFn: (data: modelApi.CreateModelRequest) => modelApi.createModel(data),
    onSuccess: async (created: modelApi.CreateModelDto) => {
      qc.setQueryData<ModelDto[]>(GET_MODELS_QUERY_KEY, (prev) =>
        prev ? [created.model, ...prev] : [created.model],
      );
      await invalidate();
    },
  });
}
