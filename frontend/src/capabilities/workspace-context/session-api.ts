/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type { AuthRequest, LoginRequest, UserDto } from "@/shared/api/openapi.gen";

export const getProfile = (signal?: AbortSignal): Promise<UserDto> =>
  appFetch<UserDto>("/api/users/me", { signal });

export const login = (payload: LoginRequest): Promise<UserDto> =>
  appFetch<UserDto>("/api/auth/login", json("POST", payload));

export const register = (payload: AuthRequest): Promise<UserDto> =>
  appFetch<UserDto>("/api/auth/register", json("POST", payload));

export const logout = (): Promise<void> => appFetch<void>("/api/logout", { method: "POST" });
