/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as modelApi from "../services";
import type { ModelDto } from "../dtos";
import { GET_MODELS_QUERY_KEY, CREATE_MODEL_QUERY_KEY } from "./query-keys";

export function useCreateModelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: CREATE_MODEL_QUERY_KEY,
    mutationFn: (data: modelApi.CreateModelRequest) => modelApi.createModel(data),
    onSuccess: (created: modelApi.CreateModelDto) => {
      // 1) Prepend model to models list
      qc.setQueryData<ModelDto[]>(GET_MODELS_QUERY_KEY, (prev) =>
        prev ? [created.model, ...prev] : [created.model],
      );

      qc.invalidateQueries({ queryKey: ["getModels"] });
    },
  });
}
