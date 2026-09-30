import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, resetPassword, updateUser } from "./admin-user.api";
import { adminUserKeys } from "./admin-user.keys";
import type { AdminCreateUserRequest, AdminUpdateUserRequest } from "@/shared/api/openapi.gen";

const locallyHandled = { errorHandledLocally: true } as const;

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: locallyHandled,
    mutationFn: (payload: AdminCreateUserRequest) => createUser(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
};

export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: locallyHandled,
    mutationFn: ({ id, payload }: { id: number; payload: AdminUpdateUserRequest }) =>
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
