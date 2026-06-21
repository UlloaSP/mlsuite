/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  leadMembershipId?: number;
  monthlyInferenceQuota?: number;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}
