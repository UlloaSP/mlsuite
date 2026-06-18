/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { InvitationDto } from "../dtos";

export const getPendingInvitations = (): Promise<InvitationDto[]> =>
  appFetch<InvitationDto[]>("/api/invitations/pending");
