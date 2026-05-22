/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";

export interface UserDTO {
  id: string;
  fullName: string;
  userName: string;
  email: string;
  avatarUrl: string | null;
  location?: string;
  systemRole: "USER" | "SUPERADMIN";
  enabled: boolean;
  createdAt: string;
}

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  fullName: string;
  username?: string;
};

export const getProfile = (): Promise<UserDTO> => appFetch<UserDTO>("/api/users/me");

export const login = (payload: LoginPayload): Promise<UserDTO> =>
  appFetch<UserDTO>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const register = (payload: RegisterPayload): Promise<UserDTO> =>
  appFetch<UserDTO>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const logout = (): Promise<void> => appFetch<void>("/api/logout", { method: "POST" });
