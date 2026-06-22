/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";

export const revokeInvitation = (organizationId: number, invitationId: number): Promise<void> =>
  appFetch<void>(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
