/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { TerminalSessionDto } from "@/api/infrastructure/dtos";

export const createTerminalSession = (serviceName: string, cols: number, rows: number) =>
  appFetch<TerminalSessionDto>(
    "/api/admin/infrastructure/terminal/sessions",
    json("POST", { serviceName, cols, rows }),
  );
