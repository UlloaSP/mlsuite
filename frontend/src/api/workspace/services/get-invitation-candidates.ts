/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { InvitationCandidateDto } from "../dtos";

export const getInvitationCandidates = (
  organizationId: number,
): Promise<InvitationCandidateDto[]> =>
  appFetch<InvitationCandidateDto[]>(`/api/organizations/${organizationId}/invitation-candidates`);
