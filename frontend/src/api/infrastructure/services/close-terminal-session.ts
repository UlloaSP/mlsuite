/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";

export const closeTerminalSession = (sessionId: string) =>
  appFetch<void>(`/api/admin/infrastructure/terminal/sessions/${sessionId}`, {
    method: "DELETE",
  });
