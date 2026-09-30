/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type { SelectOrganizationRequest, WorkspaceContextDto } from "@/shared/api/openapi.gen";

export const selectOrganization = (organizationId: number): Promise<WorkspaceContextDto> =>
  appFetch<WorkspaceContextDto>(
    "/api/workspace/context",
    json("PATCH", { organizationId } satisfies SelectOrganizationRequest),
  );
