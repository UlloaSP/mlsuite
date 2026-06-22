/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { InvitationDto } from "../dtos";

export const acceptInvitation = (token: string): Promise<InvitationDto> =>
  appFetch<InvitationDto>(`/api/invitations/${encodeURIComponent(token)}/accept`, {
    method: "POST",
  });
