/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { WorkspaceContextDto } from "@/api/workspace/dtos";

export const selectOrganization = (organizationId: number): Promise<WorkspaceContextDto> =>
  appFetch<WorkspaceContextDto>("/api/workspace/context", json("PATCH", { organizationId }));
