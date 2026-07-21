import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { createTeam, removeTeamMember, updateTeam, updateTeamMemberRole } from "./teams.api";
import {
  organizationAdminDashboardQueryKey,
  organizationTeamMembersQueryKey,
  organizationTeamQueryKey,
  organizationTeamsQueryKey,
} from "./workspace.keys";

export const useCreateTeamMutation = (organizationId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createTeam>[1]) => createTeam(organizationId, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationTeamsQueryKey(organizationId) }),
        queryClient.invalidateQueries({
          queryKey: organizationAdminDashboardQueryKey(organizationId),
        }),
        queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
      ]),
  });
};

export const useUpdateTeamMutation = (organizationId: string, teamId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateTeam>[1]) => updateTeam(teamId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationTeamQueryKey(organizationId, teamId) }),
  });
};

export const useUpdateTeamMemberRoleMutation = (organizationId: string, teamId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      roleDefinitionId,
    }: {
      membershipId: number;
      roleDefinitionId: number;
    }) => updateTeamMemberRole(teamId, membershipId, roleDefinitionId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: organizationTeamMembersQueryKey(organizationId, teamId),
      }),
  });
};

export const useRemoveTeamMemberMutation = (organizationId: string, teamId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: number) => removeTeamMember(teamId, membershipId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: organizationTeamMembersQueryKey(organizationId, teamId),
      }),
  });
};
