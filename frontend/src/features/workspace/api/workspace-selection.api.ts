/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type {
  SelectOrganizationRequest,
  WorkspaceCurrentContextDto,
} from "@/shared/api/openapi.gen";

export const selectOrganization = (organizationId: number): Promise<WorkspaceCurrentContextDto> =>
  appFetch<WorkspaceCurrentContextDto>(
    "/api/workspace/context/current",
    json("PATCH", { organizationId } satisfies SelectOrganizationRequest),
  );
