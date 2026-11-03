import { mutationOptions, useMutation } from "@tanstack/react-query";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { removeOrganizationMember, updateOrganizationMemberRole } from "./organizations.api";
import {
  organizationInvitationCandidatesQueryKey,
  organizationMembersQueryKey,
  organizationRolesQueryKey,
} from "./workspace.keys";

const updateMemberRoleMutation = (organizationId: number) =>
  mutationOptions({
    mutationFn: ({
      membershipId,
      roleDefinitionId,
    }: {
      membershipId: number;
      roleDefinitionId: number;
    }) => updateOrganizationMemberRole(organizationId, membershipId, roleDefinitionId),
    onSuccess: (_data, _variables, _result, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: organizationMembersQueryKey(organizationId) }),
        // Role catalogs count their members and list each member's assignable roles.
        client.invalidateQueries({ queryKey: organizationRolesQueryKey(organizationId) }),
        client.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
      ]),
  });

export const useUpdateOrganizationMemberRoleMutation = (organizationId: number) =>
  useMutation(updateMemberRoleMutation(organizationId));

const removeMemberMutation = (organizationId: number) =>
  mutationOptions({
    mutationFn: (membershipId: number) => removeOrganizationMember(organizationId, membershipId),
    onSuccess: (_data, _membershipId, _result, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: organizationMembersQueryKey(organizationId) }),
        client.invalidateQueries({ queryKey: organizationRolesQueryKey(organizationId) }),
        // A removed member can be invited again.
        client.invalidateQueries({
          queryKey: organizationInvitationCandidatesQueryKey(organizationId),
        }),
      ]),
  });

export const useRemoveOrganizationMemberMutation = (organizationId: number) =>
  useMutation(removeMemberMutation(organizationId));
