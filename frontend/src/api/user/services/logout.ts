/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";

export const logout = (): Promise<void> => appFetch<void>("/api/logout", { method: "POST" });
