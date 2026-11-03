/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mutationOptions, useMutation, type QueryClient } from "@tanstack/react-query";
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

type OrganizationKey = number | string;

const useOrganizationKey = () => useCurrentOrganizationId() ?? "none";

/** The catalog's counts and the bookmarks' client names follow every client change. */
const invalidateClientLists = (client: QueryClient, organizationId: OrganizationKey) =>
  Promise.all([
    client.invalidateQueries({ queryKey: API_CLIENTS_QUERY_KEY(organizationId) }),
    client.invalidateQueries({ queryKey: API_ACCESS_BOOKMARKS_QUERY_KEY(organizationId) }),
  ]);

/** A key change shows on the client's page and in the catalog's key counts. */
const invalidateClientKeys = (
  client: QueryClient,
  organizationId: OrganizationKey,
  clientId: number,
) =>
  Promise.all([
    client.invalidateQueries({ queryKey: API_CLIENT_QUERY_KEY(organizationId, clientId) }),
    client.invalidateQueries({ queryKey: API_CLIENTS_QUERY_KEY(organizationId) }),
  ]);

/** A change to a client answers with the client as it now is, which replaces the cached one. */
const clientChangeMutation = <TVariables>(
  organizationId: OrganizationKey,
  mutationFn: (variables: TVariables) => Promise<ApiClientDto>,
) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn,
    onSuccess: async (apiClient, _variables, _result, { client }) => {
      client.setQueryData(API_CLIENT_QUERY_KEY(organizationId, apiClient.client.id), apiClient);
      await invalidateClientLists(client, organizationId);
    },
  });

export const useCreateApiClientMutation = () =>
  useMutation(
    clientChangeMutation(useOrganizationKey(), (req: CreateApiClientRequest) =>
      createApiClient(req),
    ),
  );

export const useUpdateApiClientMutation = (clientId: number) =>
  useMutation(
    clientChangeMutation(useOrganizationKey(), (req: UpdateApiClientRequest) =>
      updateApiClient(clientId, req),
    ),
  );

export const useGrantApiClientBookmarkMutation = (clientId: number) =>
  useMutation(
    clientChangeMutation(useOrganizationKey(), (bookmarkId: number) =>
      grantApiClientBookmark(clientId, bookmarkId),
    ),
  );

export const useRevokeApiClientBookmarkMutation = (clientId: number) =>
  useMutation(
    clientChangeMutation(useOrganizationKey(), (bookmarkId: number) =>
      revokeApiClientBookmark(clientId, bookmarkId),
    ),
  );

const deleteApiClientMutation = (organizationId: OrganizationKey) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (clientId: number) => deleteApiClient(clientId),
    onSuccess: async (_data, clientId, _result, { client }) => {
      client.removeQueries({ queryKey: API_CLIENT_QUERY_KEY(organizationId, clientId) });
      await invalidateClientLists(client, organizationId);
    },
  });

export const useDeleteApiClientMutation = () =>
  useMutation(deleteApiClientMutation(useOrganizationKey()));

/**
 * The answer carries the key's secret. `gcTime: 0` keeps it out of the mutation cache; the
 * dialog that asked shows it from the resolved value.
 */
const issueApiClientKeyMutation = (organizationId: OrganizationKey, clientId: number) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    gcTime: 0,
    mutationFn: (req: CreateApiClientKeyRequest) => issueApiClientKey(clientId, req),
    onSuccess: (_key, _req, _result, { client }) =>
      invalidateClientKeys(client, organizationId, clientId),
  });

export const useIssueApiClientKeyMutation = (clientId: number) =>
  useMutation(issueApiClientKeyMutation(useOrganizationKey(), clientId));

/** Revoking deletes the key; calls made with it are refused at once. */
const revokeApiClientKeyMutation = (organizationId: OrganizationKey, clientId: number) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (keyId: number) => revokeApiClientKey(clientId, keyId),
    onSuccess: (_data, _keyId, _result, { client }) =>
      invalidateClientKeys(client, organizationId, clientId),
  });

export const useRevokeApiClientKeyMutation = (clientId: number) =>
  useMutation(revokeApiClientKeyMutation(useOrganizationKey(), clientId));
