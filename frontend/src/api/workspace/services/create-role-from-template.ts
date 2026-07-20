/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { RoleDefinitionDto, CreateRoleFromTemplateRequest } from "@/api/workspace/dtos";

export const createRoleFromTemplate = (
  organizationId: number,
  payload: CreateRoleFromTemplateRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/from-template`,
    json("POST", payload),
  );
