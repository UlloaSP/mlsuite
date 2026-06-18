/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";

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
