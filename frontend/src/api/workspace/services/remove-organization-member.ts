/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";

export const removeOrganizationMember = (
  organizationId: number,
  membershipId: number,
): Promise<void> =>
  appFetch<void>(`/api/organizations/${organizationId}/members/${membershipId}`, {
    method: "DELETE",
  });
