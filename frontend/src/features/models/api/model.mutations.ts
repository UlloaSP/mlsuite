/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mutationOptions, useMutation, type QueryClient } from "@tanstack/react-query";
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

type OrganizationKey = number | string;

const invalidateModelQueries = (client: QueryClient, organizationId: OrganizationKey) =>
  client.invalidateQueries({ queryKey: modelKeys.all(organizationId) });

/** Refreshes every model query without holding the mutation until they are read again. */
const modelMutation = <TData, TVariables>(
  organizationId: OrganizationKey,
  mutationFn: (variables: TVariables) => Promise<TData>,
) =>
  mutationOptions({
    mutationFn,
    onSuccess: (_data, _variables, _result, { client }) =>
      void invalidateModelQueries(client, organizationId),
  });

const useOrganizationKey = () => useCurrentOrganizationId() ?? "none";

export const useArchiveModelMutation = () =>
  useMutation(modelMutation(useOrganizationKey(), archiveModel));

export const useRestoreModelMutation = () =>
  useMutation(modelMutation(useOrganizationKey(), restoreModel));

export const useDeleteModelMutation = () =>
  useMutation(modelMutation(useOrganizationKey(), deleteModel));

export const useDuplicateModelMutation = () =>
  useMutation(modelMutation(useOrganizationKey(), duplicateModel));

export const useRenameModelMutation = () =>
  useMutation(modelMutation(useOrganizationKey(), renameModel));

/**
 * The model answers PREPARING and its page polls from there. A refusal (409: it is no longer
 * failed) still refreshes the model, so the page shows the state that refused it.
 */
const retryModelEnvironmentMutation = (organizationId: OrganizationKey) =>
  mutationOptions({
    mutationFn: (modelId: number | string) => retryModelEnvironment(modelId),
    onSuccess: (model, _modelId, _result, { client }) =>
      client.setQueryData(modelKeys.detail(organizationId, model.id), model),
    onSettled: (_model, _error, _modelId, _result, { client }) =>
      invalidateModelQueries(client, organizationId),
  });

export const useRetryModelEnvironmentMutation = () =>
  useMutation(retryModelEnvironmentMutation(useOrganizationKey()));

const createModelMutation = (organizationId: OrganizationKey) =>
  mutationOptions({
    mutationFn: (data: CreateModelRequest) => createModel(data),
    onSuccess: (_model, _data, _result, { client }) =>
      invalidateModelQueries(client, organizationId),
  });

export const useCreateModelMutation = () => useMutation(createModelMutation(useOrganizationKey()));
