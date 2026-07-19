/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { RoleDefinitionDto, CreateRoleFromTemplateRequest } from "@/api/workspace/dtos";

export const createRoleFromTemplate = (
  organizationId: number,
  payload: CreateRoleFromTemplateRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/from-template`,
    json("POST", payload),
  );
