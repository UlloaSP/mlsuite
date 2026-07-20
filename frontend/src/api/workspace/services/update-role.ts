/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { RoleDefinitionDto, UpdateRoleRequest } from "@/api/workspace/dtos";

export const updateRole = (
  organizationId: number,
  roleId: number,
  payload: UpdateRoleRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/${roleId}`,
    json("PATCH", payload),
  );
