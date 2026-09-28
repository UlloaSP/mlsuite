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
import { modelKeys } from "./model.keys";
import type { CreateModelRequest, ModelDto } from "./model.types";

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
    mutationFn: (data: CreateModelRequest) => createModel(data),
    onSuccess: async (created) => {
      queryClient.setQueryData<ModelDto[]>(modelKeys.list(organizationId), (previous) =>
        previous ? [created.model, ...previous] : [created.model],
      );
      await invalidate();
    },
  });
};

export const useInspectArtifactMutation = () =>
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation -- Inspection is a read-only command and changes no cached resource.
  useMutation({ meta: { errorHandledLocally: true }, mutationFn: inspectArtifact });

export const useMatchArtifactsMutation = () =>
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation -- Matching is a read-only command and changes no cached resource.
  useMutation({ meta: { errorHandledLocally: true }, mutationFn: matchArtifacts });
