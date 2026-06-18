/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";

export const closeTerminalSession = (sessionId: string) =>
  appFetch<void>(`/api/admin/infrastructure/terminal/sessions/${sessionId}`, {
    method: "DELETE",
  });
