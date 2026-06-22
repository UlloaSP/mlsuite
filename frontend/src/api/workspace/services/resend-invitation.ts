/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { InvitationDto } from "../dtos";

export const resendInvitation = (
  organizationId: number,
  invitationId: number,
): Promise<InvitationDto> =>
  appFetch<InvitationDto>(
    `/api/organizations/${organizationId}/invitations/${invitationId}/resend`,
    { method: "POST" },
  );
