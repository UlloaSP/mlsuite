/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { InvitationDto, CreateInvitationRequest } from "@/api/workspace/dtos";

export const createInvitation = (
  organizationId: number,
  payload: CreateInvitationRequest,
): Promise<InvitationDto> =>
  appFetch<InvitationDto>(
    `/api/organizations/${organizationId}/invitations`,
    json("POST", payload),
  );
