/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";

export const bulkRevokeInvitations = (
  organizationId: number,
  invitationIds: number[],
): Promise<void> =>
  appFetch<void>(
    `/api/organizations/${organizationId}/invitations/bulk-revoke`,
    json("POST", { invitationIds }),
  );
