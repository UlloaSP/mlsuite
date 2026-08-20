import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  createRoleFromTemplate,
  deleteRole,
  duplicateRole,
  updateRole,
} from "./roles.api";
import { organizationRolesQueryKey } from "./workspace.keys";

export const useRoleMutations = (organizationId: number) => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: organizationRolesQueryKey(organizationId) });
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
