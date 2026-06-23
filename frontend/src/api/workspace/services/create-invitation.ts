/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { InvitationDto, CreateInvitationRequest } from "../dtos";

export const createInvitation = (
  organizationId: number,
  payload: CreateInvitationRequest,
): Promise<InvitationDto> =>
  appFetch<InvitationDto>(
    `/api/organizations/${organizationId}/invitations`,
    json("POST", payload),
  );
