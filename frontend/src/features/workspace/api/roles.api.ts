/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type {
  CreateRoleFromTemplateRequest,
  CreateRoleRequest,
  DuplicateRoleRequest,
  RoleDefinitionDto,
  UpdateRoleRequest,
} from "@/shared/api/openapi.gen";

export const createRoleFromTemplate = (
  organizationId: number,
  payload: CreateRoleFromTemplateRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/from-template`,
    json("POST", payload),
  );

export const createRole = (
  organizationId: number,
  payload: CreateRoleRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(`/api/organizations/${organizationId}/roles`, json("POST", payload));

export const deleteRole = (
  organizationId: number,
  roleId: number,
  replacementRoleId?: number,
): Promise<void> => {
  const suffix = replacementRoleId ? `?replacementRoleId=${replacementRoleId}` : "";
  return appFetch<void>(`/api/organizations/${organizationId}/roles/${roleId}${suffix}`, {
    method: "DELETE",
  });
};

export const duplicateRole = (
  organizationId: number,
  roleId: number,
  name: string,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/${roleId}/duplicate`,
    json("POST", { name } satisfies DuplicateRoleRequest),
  );

export const updateRole = (
  organizationId: number,
  roleId: number,
  payload: UpdateRoleRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/${roleId}`,
    json("PATCH", payload),
  );
