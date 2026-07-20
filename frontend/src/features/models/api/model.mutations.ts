/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import {
  archiveModel,
  createModel,
  deleteModel,
  duplicateModel,
  inspectArtifact,
  matchArtifacts,
  renameModel,
} from "./model.api";
import {
  CREATE_MODEL_QUERY_KEY,
  GET_MODELS_QUERY_KEY,
  INSPECT_ARTIFACT_QUERY_KEY,
  MATCH_ARTIFACTS_QUERY_KEY,
  MODEL_CATALOG_PAGE_QUERY_KEY,
} from "./model.keys";
import type { CreateModelRequest, MatchArtifactsRequest, ModelDto } from "./model.types";

export const useInvalidateModelQueries = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: GET_MODELS_QUERY_KEY(organizationId) }),
      queryClient.invalidateQueries({ queryKey: MODEL_CATALOG_PAGE_QUERY_KEY(organizationId) }),
    ]);
  };
};

const invalidatingMutationOptions = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  invalidate: () => Promise<void>,
) => ({
  meta: { errorHandledLocally: true },
  mutationFn,
  onSuccess: () => void invalidate(),
});

export const useArchiveModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation(invalidatingMutationOptions(archiveModel, invalidate));
};

export const useDeleteModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation(invalidatingMutationOptions(deleteModel, invalidate));
};

export const useDuplicateModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation(invalidatingMutationOptions(duplicateModel, invalidate));
};

export const useRenameModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation(invalidatingMutationOptions(renameModel, invalidate));
};

export const useCreateModelMutation = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  const invalidate = useInvalidateModelQueries();
  return useMutation({
    mutationKey: CREATE_MODEL_QUERY_KEY,
    mutationFn: (data: CreateModelRequest) => createModel(data),
    onSuccess: async (created) => {
      queryClient.setQueryData<ModelDto[]>(GET_MODELS_QUERY_KEY(organizationId), (previous) =>
        previous ? [created.model, ...previous] : [created.model],
      );
      await invalidate();
    },
  });
};

export const useInspectArtifactMutation = () =>
  useMutation({
    meta: { errorHandledLocally: true },
    mutationKey: INSPECT_ARTIFACT_QUERY_KEY,
    mutationFn: inspectArtifact,
  });

export const useMatchArtifactsMutation = () =>
  useMutation({
    meta: { errorHandledLocally: true },
    mutationKey: MATCH_ARTIFACTS_QUERY_KEY,
    mutationFn: (request: MatchArtifactsRequest) => matchArtifacts(request),
  });
