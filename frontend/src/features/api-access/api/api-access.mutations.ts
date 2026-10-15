/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import {
  createApiClient,
  deleteApiClient,
  grantApiClientBookmark,
  issueApiClientKey,
  revokeApiClientBookmark,
  revokeApiClientKey,
  updateApiClient,
} from "./api-access.api";
import {
  API_ACCESS_BOOKMARKS_QUERY_KEY,
  API_CLIENTS_QUERY_KEY,
  API_CLIENT_QUERY_KEY,
} from "./api-access.keys";
import type {
  ApiClientDto,
  CreateApiClientKeyRequest,
  CreateApiClientRequest,
  UpdateApiClientRequest,
} from "@/shared/api/openapi.gen";

/**
 * A change to a client answers with the client as it now is, which replaces the cached one; the
 * catalog's counts and the bookmarks' client names are read again.
 */
function useClientChange<TVariables>(mutationFn: (variables: TVariables) => Promise<ApiClientDto>) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn,
    onSuccess: async (client) => {
      qc.setQueryData(API_CLIENT_QUERY_KEY(organizationId, client.client.id), client);
      await Promise.all([
        qc.invalidateQueries({ queryKey: API_CLIENTS_QUERY_KEY(organizationId) }),
        qc.invalidateQueries({ queryKey: API_ACCESS_BOOKMARKS_QUERY_KEY(organizationId) }),
      ]);
    },
  });
}

export const useCreateApiClientMutation = () =>
  useClientChange((req: CreateApiClientRequest) => createApiClient(req));

export const useUpdateApiClientMutation = (clientId: number) =>
  useClientChange((req: UpdateApiClientRequest) => updateApiClient(clientId, req));

export const useGrantApiClientBookmarkMutation = (clientId: number) =>
  useClientChange((bookmarkId: number) => grantApiClientBookmark(clientId, bookmarkId));

export const useRevokeApiClientBookmarkMutation = (clientId: number) =>
  useClientChange((bookmarkId: number) => revokeApiClientBookmark(clientId, bookmarkId));

export function useDeleteApiClientMutation() {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (clientId: number) => deleteApiClient(clientId),
    onSuccess: async (_, clientId) => {
      qc.removeQueries({ queryKey: API_CLIENT_QUERY_KEY(organizationId, clientId) });
      await Promise.all([
        qc.invalidateQueries({ queryKey: API_CLIENTS_QUERY_KEY(organizationId) }),
        qc.invalidateQueries({ queryKey: API_ACCESS_BOOKMARKS_QUERY_KEY(organizationId) }),
      ]);
    },
  });
}

/**
 * The answer carries the key's secret. `gcTime: 0` keeps it out of the mutation cache; the
 * dialog that asked shows it from the resolved value.
 */
export function useIssueApiClientKeyMutation(clientId: number) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    gcTime: 0,
    mutationFn: (req: CreateApiClientKeyRequest) => issueApiClientKey(clientId, req),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: API_CLIENT_QUERY_KEY(organizationId, clientId) }),
        qc.invalidateQueries({ queryKey: API_CLIENTS_QUERY_KEY(organizationId) }),
      ]),
  });
}

/** Revoking deletes the key; calls made with it are refused at once. */
export function useRevokeApiClientKeyMutation(clientId: number) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (keyId: number) => revokeApiClientKey(clientId, keyId),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: API_CLIENT_QUERY_KEY(organizationId, clientId) }),
        qc.invalidateQueries({ queryKey: API_CLIENTS_QUERY_KEY(organizationId) }),
      ]),
  });
}
