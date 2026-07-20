/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type { WorkspaceContextDto } from "@/capabilities/workspace-context/workspace-context.types";

export const selectOrganization = (organizationId: number): Promise<WorkspaceContextDto> =>
  appFetch<WorkspaceContextDto>("/api/workspace/context", json("PATCH", { organizationId }));
