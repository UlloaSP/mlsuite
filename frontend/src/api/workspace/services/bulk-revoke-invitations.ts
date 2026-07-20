/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";

export const bulkRevokeInvitations = (
  organizationId: number,
  invitationIds: number[],
): Promise<void> =>
  appFetch<void>(
    `/api/organizations/${organizationId}/invitations/bulk-revoke`,
    json("POST", { invitationIds }),
  );
