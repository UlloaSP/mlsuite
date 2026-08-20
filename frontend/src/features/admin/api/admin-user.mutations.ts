import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, resetPassword, updateUser } from "./admin-user.api";
import { adminUserKeys } from "./admin-user.keys";
import type { AdminCreateUserPayload, AdminUpdateUserPayload } from "./admin-user.types";

const locallyHandled = { errorHandledLocally: true } as const;

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: locallyHandled,
    mutationFn: (payload: AdminCreateUserPayload) => createUser(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
};

export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: locallyHandled,
    mutationFn: ({ id, payload }: { id: number; payload: AdminUpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
};

export const useResetAdminUserPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: locallyHandled,
    mutationFn: ({ id, password }: { id: number; password: string }) => resetPassword(id, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
};

export const useDeleteAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: locallyHandled,
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
};
