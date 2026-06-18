/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export interface OrganizationAdminStatsDto {
  totalTeams: number;
  activeTeams: number;
  totalMembers: number;
  totalModels: number;
  pendingInvitations: number;
  quotaUsed: number;
  quotaLimit: number;
}
