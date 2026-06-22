/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { RoleDefinitionDto } from "../dtos";

export const duplicateRole = (
  organizationId: number,
  roleId: number,
  name: string,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/${roleId}/duplicate`,
    json("POST", { name }),
  );
