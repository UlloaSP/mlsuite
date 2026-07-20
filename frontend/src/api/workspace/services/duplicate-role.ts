/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { RoleDefinitionDto } from "@/api/workspace/dtos";

export const duplicateRole = (
  organizationId: number,
  roleId: number,
  name: string,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/${roleId}/duplicate`,
    json("POST", { name }),
  );
