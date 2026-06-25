/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";

export const deleteOrganization = (organizationId: number): Promise<void> =>
  appFetch<void>(`/api/organizations/${organizationId}`, { method: "DELETE" });
