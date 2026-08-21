/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceContextDto } from "@/capabilities/workspace-context/workspace-context.types";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { acceptInvitation, declineInvitation } from "./invitations.api";
import {
  createOrganization,
  deleteOrganization,
  transferOrganizationOwnership,
  updateOrganization,
} from "./organizations.api";
import { selectOrganization } from "./workspace-selection.api";
import { removeOrganizationCache } from "./organization-cache";
import {
  ORGANIZATIONS_QUERY_KEY,
  ORGANIZATION_CATALOG_PAGE_QUERY_KEY,
  organizationDetailsQueryKey,
  organizationAdminDashboardQueryKey,
  organizationMembersQueryKey,
  PENDING_INVITATIONS_QUERY_KEY,
} from "./workspace.keys";

export const useAcceptInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
      void qc.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY });
    },
  });
};

export const useDeclineInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
    },
  });
};

export const useDeleteOrganizationMutation = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: deleteOrganization,
    onSuccess: async (_data, organizationId) => {
      await removeOrganizationCache(queryClient, organizationId);
      await invalidate();
    },
  });
};

export const useCreateOrganizationMutation = () => {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: createOrganization,
    onSuccess: () => void invalidate(),
  });
};

export const useUpdateOrganizationMutation = (organizationId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (request: Parameters<typeof updateOrganization>[1]) =>
      updateOrganization(organizationId, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationDetailsQueryKey(organizationId) }),
        queryClient.invalidateQueries({
          queryKey: organizationAdminDashboardQueryKey(organizationId),
        }),
        queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
      ]);
    },
  });
};

export const useInvalidateOrganizationQueries = () => {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_CATALOG_PAGE_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
    ]);
  };
};

type RenameOrganizationRequest = {
  description?: string | null;
  id: number;
  name: string;
  slug?: string;
};

export const useRenameOrganizationMutation = () => {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: ({ id, name, slug, description }: RenameOrganizationRequest) =>
      updateOrganization(id, { name, slug, description: description ?? undefined }),
    onSuccess: () => void invalidate(),
  });
};

export const useSelectOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: selectOrganization,
    onSuccess: async (context) => {
      const previous = qc.getQueryData<WorkspaceContextDto>(WORKSPACE_CONTEXT_QUERY_KEY);
      const previousOrganizationId = previous?.currentOrganization.id;
      if (previousOrganizationId !== undefined) {
        await removeOrganizationCache(qc, previousOrganizationId);
      }
      qc.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY, context);
    },
  });
};

type TransferOrganizationOwnershipRequest = {
  organizationId: number;
  nextOwnerMembershipId: number;
};

export const useTransferOrganizationOwnershipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: ({ organizationId, nextOwnerMembershipId }: TransferOrganizationOwnershipRequest) =>
      transferOrganizationOwnership(organizationId, nextOwnerMembershipId),
    onSuccess: async (_data, request) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: organizationMembersQueryKey(request.organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationDetailsQueryKey(request.organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationAdminDashboardQueryKey(request.organizationId),
        }),
        queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY }),
      ]);
    },
  });
};
