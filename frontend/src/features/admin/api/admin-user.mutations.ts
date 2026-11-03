import { mutationOptions, useMutation } from "@tanstack/react-query";
import { createUser, resetPassword, updateUser } from "./admin-user.api";
import { adminUserKeys } from "./admin-user.keys";
import type { AdminCreateUserRequest, AdminUpdateUserRequest } from "@/shared/api/openapi.gen";

/** Every change to a user is answered by the dialog that asked, and refreshes the user lists. */
const adminUserMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn,
    onSuccess: (_data, _variables, _result, { client }) =>
      client.invalidateQueries({ queryKey: adminUserKeys.all }),
  });

const createAdminUser = adminUserMutation((payload: AdminCreateUserRequest) => createUser(payload));

const updateAdminUser = adminUserMutation(
  ({ id, payload }: { id: number; payload: AdminUpdateUserRequest }) => updateUser(id, payload),
);

const resetAdminUserPassword = adminUserMutation(
  ({ id, password }: { id: number; password: string }) => resetPassword(id, password),
);

export const useCreateAdminUser = () => useMutation(createAdminUser);

export const useUpdateAdminUser = () => useMutation(updateAdminUser);

export const useResetAdminUserPassword = () => useMutation(resetAdminUserPassword);
