import { appFetch, json } from "@/shared/api/http";
import type {
  AdminCreateUserPayload,
  AdminUpdateUserPayload,
  AdminUser,
  AdminUserPage,
  AdminUserPageRequest,
} from "./admin-user.types";

export const listUsers = (
  { page, role, search, size, sort }: AdminUserPageRequest,
  signal?: AbortSignal,
): Promise<AdminUserPage> => {
  const params = new URLSearchParams({
    page: String(page),
    role,
    search,
    size: String(size),
    sort,
  });

  return appFetch<AdminUserPage>(`/api/admin/users?${params.toString()}`, { signal });
};

export const createUser = (payload: AdminCreateUserPayload): Promise<AdminUser> =>
  appFetch<AdminUser>("/api/admin/users", json("POST", payload));

export const updateUser = (id: number, payload: AdminUpdateUserPayload): Promise<AdminUser> =>
  appFetch<AdminUser>(`/api/admin/users/${id}`, json("PATCH", payload));

export const resetPassword = (id: number, password: string): Promise<void> =>
  appFetch<void>(`/api/admin/users/${id}/password`, json("POST", { password }));

export const deleteUser = (id: number): Promise<void> =>
  appFetch<void>(`/api/admin/users/${id}`, { method: "DELETE" });
