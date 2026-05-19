import { appFetch } from "../../app/api/appFetch";

export type AdminUserDto = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  systemRole: "USER" | "SUPERADMIN";
  enabled: boolean;
  createdAt: string;
};

export type AdminCreateUserPayload = {
  email: string;
  password: string;
  fullName: string;
  username?: string;
  systemRole?: "USER" | "SUPERADMIN";
  enabled?: boolean;
};

export type AdminUpdateUserPayload = {
  username?: string;
  fullName?: string;
  systemRole?: "USER" | "SUPERADMIN";
  enabled?: boolean;
};

export const listUsers = (): Promise<AdminUserDto[]> =>
  appFetch<AdminUserDto[]>("/api/admin/users");

export const createUser = (payload: AdminCreateUserPayload): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>("/api/admin/users", json("POST", payload));

export const updateUser = (id: number, payload: AdminUpdateUserPayload): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>(`/api/admin/users/${id}`, json("PATCH", payload));

export const resetPassword = (id: number, password: string): Promise<void> =>
  appFetch<void>(`/api/admin/users/${id}/password`, json("POST", { password }));

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
