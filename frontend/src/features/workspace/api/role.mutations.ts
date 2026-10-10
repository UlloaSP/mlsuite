import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  createRoleFromTemplate,
  deleteRole,
  duplicateRole,
  updateRole,
} from "./roles.api";
import { organizationQueryKey } from "@/shared/api/organization-query-key";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";

export const useRoleMutations = (organizationId: number) => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationQueryKey(organizationId) }),
      queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
    ]);
  return {
    create: useMutation({
      mutationFn: (payload: Parameters<typeof createRole>[1]) =>
        createRole(organizationId, payload),
      onSuccess: invalidate,
    }),
    createFromTemplate: useMutation({
      mutationFn: (payload: Parameters<typeof createRoleFromTemplate>[1]) =>
        createRoleFromTemplate(organizationId, payload),
      onSuccess: invalidate,
    }),
    delete: useMutation({
      mutationFn: (roleId: number) => deleteRole(organizationId, roleId),
      onSuccess: invalidate,
    }),
    duplicate: useMutation({
      mutationFn: ({ roleId, name }: { roleId: number; name: string }) =>
        duplicateRole(organizationId, roleId, name),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        roleId,
        payload,
      }: {
        roleId: number;
        payload: Parameters<typeof updateRole>[2];
      }) => updateRole(organizationId, roleId, payload),
      onSuccess: invalidate,
    }),
  };
};
