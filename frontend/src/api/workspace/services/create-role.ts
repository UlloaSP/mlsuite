/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { RoleDefinitionDto, CreateRoleRequest } from "@/api/workspace/dtos";

export const createRole = (
  organizationId: number,
  payload: CreateRoleRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(`/api/organizations/${organizationId}/roles`, json("POST", payload));
