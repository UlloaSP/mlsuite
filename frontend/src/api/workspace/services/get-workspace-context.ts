/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { WorkspaceContextDto } from "@/api/workspace/dtos";

export const getWorkspaceContext = (): Promise<WorkspaceContextDto> =>
  appFetch<WorkspaceContextDto>("/api/workspace/context");
