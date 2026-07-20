/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";

export const resetPassword = (id: number, password: string): Promise<void> =>
  appFetch<void>(`/api/admin/users/${id}/password`, json("POST", { password }));
