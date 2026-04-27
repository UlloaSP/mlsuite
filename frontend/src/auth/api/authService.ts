/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";
import type { UserDTO } from "../../user/api/userService";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  fullName: string;
  username: string;
}

export const login = (request: LoginRequest): Promise<UserDTO> =>
  appFetch<UserDTO>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

export const register = (request: RegisterRequest): Promise<UserDTO> =>
  appFetch<UserDTO>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
