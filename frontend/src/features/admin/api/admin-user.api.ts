import { appFetch, json } from "@/shared/api/http";
import type { AdminUserPageRequest } from "./admin-user.types";
import type {
  AdminCreateUserRequest,
  AdminPasswordRequest,
  AdminUpdateUserRequest,
  AdminUserDto,
  AdminUserPageDto,
} from "@/shared/api/openapi.gen";

export const listUsers = (
  { page, role, search, size, sort }: AdminUserPageRequest,
  signal?: AbortSignal,
): Promise<AdminUserPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    role,
    search,
    size: String(size),
    sort,
  });

  return appFetch<AdminUserPageDto>(`/api/admin/users?${params.toString()}`, { signal });
};

export const createUser = (payload: AdminCreateUserRequest): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>("/api/admin/users", json("POST", payload));

export const updateUser = (id: number, payload: AdminUpdateUserRequest): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>(`/api/admin/users/${id}`, json("PATCH", payload));

export const resetPassword = (id: number, password: string): Promise<void> =>
  appFetch<void>(
    `/api/admin/users/${id}/password`,
    json("POST", { password } satisfies AdminPasswordRequest),
  );

export const deleteUser = (id: number): Promise<void> =>
  appFetch<void>(`/api/admin/users/${id}`, { method: "DELETE" });
