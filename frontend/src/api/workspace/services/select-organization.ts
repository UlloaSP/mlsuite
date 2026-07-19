/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { WorkspaceContextDto } from "@/api/workspace/dtos";

export const selectOrganization = (organizationId: number): Promise<WorkspaceContextDto> =>
  appFetch<WorkspaceContextDto>("/api/workspace/context", json("PATCH", { organizationId }));
