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
  renameModel,
  restoreModel,
  retryModelEnvironment,
} from "./model.api";
import { modelKeys } from "./model.keys";
import type { CreateModelRequest } from "./model.types";
import type { ModelDto } from "@/shared/api/openapi.gen";

const useInvalidateModelQueries = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return () => queryClient.invalidateQueries({ queryKey: modelKeys.all(organizationId) });
};

const invalidatingMutationOptions = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  invalidate: () => Promise<void>,
) => ({
  mutationFn,
  onSuccess: () => void invalidate(),
});

export const useArchiveModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation(invalidatingMutationOptions(archiveModel, invalidate));
};

export const useRestoreModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation(invalidatingMutationOptions(restoreModel, invalidate));
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

/**
 * The model answers PREPARING and its page polls from there. A refusal (409: it is no longer
 * failed) still refreshes the model, so the page shows the state that refused it.
 */
export const useRetryModelEnvironmentMutation = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  const invalidate = useInvalidateModelQueries();
  return useMutation({
    mutationFn: (modelId: number | string) => retryModelEnvironment(modelId),
    onSuccess: (model: ModelDto) =>
      queryClient.setQueryData(modelKeys.detail(organizationId, model.id), model),
    onSettled: () => invalidate(),
  });
};

export const useCreateModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation({
    mutationFn: (data: CreateModelRequest) => createModel(data),
    onSuccess: () => invalidate(),
  });
};
