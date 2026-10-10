import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { removeOrganizationMember, updateOrganizationMemberRole } from "./organizations.api";
import {
  organizationInvitationCandidatesQueryKey,
  organizationMembersQueryKey,
  organizationRolesQueryKey,
} from "./workspace.keys";

export const useUpdateOrganizationMemberRoleMutation = (organizationId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      roleDefinitionId,
    }: {
      membershipId: number;
      roleDefinitionId: number;
    }) => updateOrganizationMemberRole(organizationId, membershipId, roleDefinitionId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationMembersQueryKey(organizationId) }),
        // Role catalogs count their members and list each member's assignable roles.
        queryClient.invalidateQueries({ queryKey: organizationRolesQueryKey(organizationId) }),
        queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
      ]),
  });
};

export const useRemoveOrganizationMemberMutation = (organizationId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: number) => removeOrganizationMember(organizationId, membershipId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationMembersQueryKey(organizationId) }),
        queryClient.invalidateQueries({ queryKey: organizationRolesQueryKey(organizationId) }),
        // A removed member can be invited again.
        queryClient.invalidateQueries({
          queryKey: organizationInvitationCandidatesQueryKey(organizationId),
        }),
      ]),
  });
};
