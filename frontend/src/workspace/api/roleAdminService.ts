import { appFetch } from "../../app/api/appFetch";
import type {
  CreateRoleFromTemplateRequest,
  CreateRoleRequest,
  RoleDefinitionDto,
  RolesResponseDto,
  UpdateRoleRequest,
} from "../types";

const json = (method: "POST" | "PATCH", body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getRoles = (organizationId: number): Promise<RolesResponseDto> =>
  appFetch<RolesResponseDto>(`/api/organizations/${organizationId}/roles`);

export const createRole = (
  organizationId: number,
  payload: CreateRoleRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(`/api/organizations/${organizationId}/roles`, json("POST", payload));

export const createRoleFromTemplate = (
  organizationId: number,
  payload: CreateRoleFromTemplateRequest,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/from-template`,
    json("POST", payload),
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

export const duplicateRole = (
  organizationId: number,
  roleId: number,
  name: string,
): Promise<RoleDefinitionDto> =>
  appFetch<RoleDefinitionDto>(
    `/api/organizations/${organizationId}/roles/${roleId}/duplicate`,
    json("POST", { name }),
  );

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
