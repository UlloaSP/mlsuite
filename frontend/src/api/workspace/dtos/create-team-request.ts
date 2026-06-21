/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface CreateTeamRequest {
  name: string;
  slug?: string;
  description?: string;
  leadMembershipId?: number;
  monthlyInferenceQuota?: number;
}
