import { mutationOptions, useMutation } from "@tanstack/react-query";
import {
  createRole,
  createRoleFromTemplate,
  deleteRole,
  duplicateRole,
  updateRole,
} from "./roles.api";
import { organizationQueryKey } from "@/shared/api/organization-query-key";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";

/** A role change can alter what the member may do, so their workspace context is read again. */
const roleMutation = <TData, TVariables>(
  organizationId: number,
  mutationFn: (variables: TVariables) => Promise<TData>,
) =>
  mutationOptions({
    mutationFn,
    onSuccess: (_data, _variables, _result, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: organizationQueryKey(organizationId) }),
        client.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
      ]),
  });

export const useRoleMutations = (organizationId: number) => ({
  create: useMutation(
    roleMutation(organizationId, (payload: Parameters<typeof createRole>[1]) =>
      createRole(organizationId, payload),
    ),
  ),
  createFromTemplate: useMutation(
    roleMutation(organizationId, (payload: Parameters<typeof createRoleFromTemplate>[1]) =>
      createRoleFromTemplate(organizationId, payload),
    ),
  ),
  delete: useMutation(
    roleMutation(organizationId, (roleId: number) => deleteRole(organizationId, roleId)),
  ),
  duplicate: useMutation(
    roleMutation(organizationId, ({ roleId, name }: { roleId: number; name: string }) =>
      duplicateRole(organizationId, roleId, name),
    ),
  ),
  update: useMutation(
    roleMutation(
      organizationId,
      ({ roleId, payload }: { roleId: number; payload: Parameters<typeof updateRole>[2] }) =>
        updateRole(organizationId, roleId, payload),
    ),
  ),
});
