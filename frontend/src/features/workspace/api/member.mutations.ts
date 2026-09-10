import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { removeOrganizationMember, updateOrganizationMemberRole } from "./organizations.api";
import { organizationMembersQueryKey } from "./workspace.keys";

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
        queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
      ]),
  });
};

export const useRemoveOrganizationMemberMutation = (organizationId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: number) => removeOrganizationMember(organizationId, membershipId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationMembersQueryKey(organizationId) }),
  });
};
