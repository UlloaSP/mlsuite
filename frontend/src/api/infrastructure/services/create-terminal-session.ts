/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { TerminalSessionDto } from "@/api/infrastructure/dtos";

export const createTerminalSession = (serviceName: string, cols: number, rows: number) =>
  appFetch<TerminalSessionDto>(
    "/api/admin/infrastructure/terminal/sessions",
    json("POST", { serviceName, cols, rows }),
  );
