/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { RoleDefinitionDto, UpdateRoleRequest } from "../dtos";

export const updateRole = (
  organizationId: number,
  roleId: number,
  payload: UpdateRoleRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/${roleId}`,
    json("PATCH", payload),
  );
