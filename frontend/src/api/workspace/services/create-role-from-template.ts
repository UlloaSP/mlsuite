/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { RoleDefinitionDto, CreateRoleFromTemplateRequest } from "../dtos";

export const createRoleFromTemplate = (
  organizationId: number,
  payload: CreateRoleFromTemplateRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/from-template`,
    json("POST", payload),
  );
