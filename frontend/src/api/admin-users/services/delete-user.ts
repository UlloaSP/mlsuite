/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";

export const deleteUser = (id: number): Promise<void> =>
  appFetch<void>(`/api/admin/users/${id}`, { method: "DELETE" });
