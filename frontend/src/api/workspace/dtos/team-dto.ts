/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export interface TeamDto {
  id: number;
  organizationId: number;
  slug: string;
  name: string;
  description?: string | null;
  leadName?: string | null;
  leadEmail?: string | null;
  memberCount?: number;
  modelCount?: number;
  quotaUsed?: number;
  quotaLimit?: number | null;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}
