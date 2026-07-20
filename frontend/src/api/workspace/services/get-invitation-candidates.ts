/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { InvitationCandidateDto } from "@/api/workspace/dtos";

export const getInvitationCandidates = (
  organizationId: number,
  signal?: AbortSignal,
): Promise<InvitationCandidateDto[]> =>
  appFetch<InvitationCandidateDto[]>(`/api/organizations/${organizationId}/invitation-candidates`, {
    signal,
  });
