/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mutationOptions, useMutation, type QueryClient } from "@tanstack/react-query";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { actInOrganization } from "@/shared/api/http";
import {
  createOrganization,
  deleteOrganization,
  removeOrganizationLogo,
  replaceOrganizationLogo,
  transferOrganizationOwnership,
  updateOrganization,
} from "./organizations.api";
import { selectOrganization } from "./workspace-selection.api";
import { removeOrganizationCache } from "./organization-cache";
import {
  ORGANIZATION_CATALOG_PAGE_QUERY_KEY,
  organizationAdminDashboardQueryKey,
  organizationMembersQueryKey,
} from "./workspace.keys";
import type {
  OrganizationDto,
  UpdateOrganizationRequest,
  WorkspaceCurrentContextDto,
} from "@/shared/api/openapi.gen";

const invalidateOrganizationQueries = async (client: QueryClient) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: ORGANIZATION_CATALOG_PAGE_QUERY_KEY }),
    client.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
  ]);
};

/** Whatever shows the organization, including its own dashboard, is read again. */
const invalidateOrganization = (client: QueryClient, organizationId: number) =>
  Promise.all([
    client.invalidateQueries({ queryKey: organizationAdminDashboardQueryKey(organizationId) }),
    invalidateOrganizationQueries(client),
  ]);

const deleteOrganizationMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: deleteOrganization,
  onSuccess: async (_data, organizationId, _result, { client }) => {
    await removeOrganizationCache(client, organizationId);
    await invalidateOrganizationQueries(client);
  },
});

export const useDeleteOrganizationMutation = () => useMutation(deleteOrganizationMutation);

const createOrganizationMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: createOrganization,
  onSuccess: (_organization, _request, _result, { client }) =>
    void invalidateOrganizationQueries(client),
});

export const useCreateOrganizationMutation = () => useMutation(createOrganizationMutation);

const updateOrganizationMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: ({ id, ...request }: UpdateOrganizationRequest & { id: number }) =>
    updateOrganization(id, request),
  onSuccess: async (_data, { id }, _result, { client }) => {
    await invalidateOrganization(client, id);
  },
});

export const useUpdateOrganizationMutation = () => useMutation(updateOrganizationMutation);

/** The logo is part of the organization: whatever shows the organization is refreshed. */
const organizationLogoMutation = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<OrganizationDto>,
) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn,
    onSuccess: async (organization, _variables, _result, { client }) => {
      await invalidateOrganization(client, organization.id);
    },
  });

const replaceLogoMutation = organizationLogoMutation(
  ({ organizationId, file }: { organizationId: number; file: File }) =>
    replaceOrganizationLogo(organizationId, file),
);

const removeLogoMutation = organizationLogoMutation((organizationId: number) =>
  removeOrganizationLogo(organizationId),
);

export const useReplaceOrganizationLogoMutation = () => useMutation(replaceLogoMutation);

export const useRemoveOrganizationLogoMutation = () => useMutation(removeLogoMutation);

const selectOrganizationMutation = (meta?: { errorHandledLocally: boolean }) =>
  mutationOptions({
    meta,
    mutationFn: selectOrganization,
    onSuccess: async (context, _organizationId, _result, { client }) => {
      // This tab works in the selected organization from now on; other tabs keep theirs.
      actInOrganization(context.currentOrganization.id);
      const previous = client.getQueryData<WorkspaceCurrentContextDto>(WORKSPACE_CONTEXT_QUERY_KEY);
      const previousOrganizationId = previous?.currentOrganization.id;
      if (previousOrganizationId !== undefined) {
        await removeOrganizationCache(client, previousOrganizationId);
      }
      client.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY, context);
    },
  });

export const useSelectOrganization = (meta?: { errorHandledLocally: boolean }) =>
  useMutation(selectOrganizationMutation(meta));

type TransferOrganizationOwnershipRequest = {
  organizationId: number;
  nextOwnerMembershipId: number;
};

const transferOwnershipMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: ({ organizationId, nextOwnerMembershipId }: TransferOrganizationOwnershipRequest) =>
    transferOrganizationOwnership(organizationId, nextOwnerMembershipId),
  onSuccess: async (_data, request, _result, { client }) => {
    await Promise.all([
      client.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
      client.invalidateQueries({ queryKey: organizationMembersQueryKey(request.organizationId) }),
      client.invalidateQueries({
        queryKey: organizationAdminDashboardQueryKey(request.organizationId),
      }),
      client.invalidateQueries({ queryKey: ORGANIZATION_CATALOG_PAGE_QUERY_KEY }),
    ]);
  },
});

export const useTransferOrganizationOwnershipMutation = () =>
  useMutation(transferOwnershipMutation);
