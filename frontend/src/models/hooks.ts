/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelDto } from "./api/modelService";
import * as artifactApi from "./api/artifactService";
import * as modelApi from "./api/modelService";

/** -------------------- Query Keys -------------------- */
const GET_MODELS_QUERY_KEY = ["getModels"] as const;

/** -------------------- Reads -------------------- */
export const useGetModels = () =>
  useQuery({
    queryKey: GET_MODELS_QUERY_KEY,
    queryFn: modelApi.getModels,
    gcTime: 10 * 60_000,
    retry: (count, err: any) => {
      const s = err?.status ?? err?.response?.status;
      if (s === 401 || s === 403) return false;
      return count < 2;
    },
  });

/** -------------------- Writes -------------------- */
const INSPECT_ARTIFACT_QUERY_KEY = ["inspectArtifact"] as const;
const MATCH_ARTIFACTS_QUERY_KEY = ["matchArtifacts"] as const;

export function useInspectArtifactMutation() {
  return useMutation({
    mutationKey: INSPECT_ARTIFACT_QUERY_KEY,
    mutationFn: (artifact: File) => artifactApi.inspectArtifact(artifact),
  });
}

export function useMatchArtifactsMutation() {
  return useMutation({
    mutationKey: MATCH_ARTIFACTS_QUERY_KEY,
    mutationFn: (request: artifactApi.MatchArtifactsRequest) => artifactApi.matchArtifacts(request),
  });
}

const CREATE_MODEL_QUERY_KEY = ["createModel"] as const;

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
