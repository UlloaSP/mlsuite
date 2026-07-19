/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";

export const resetPassword = (id: number, password: string): Promise<void> =>
  appFetch<void>(`/api/admin/users/${id}/password`, json("POST", { password }));
