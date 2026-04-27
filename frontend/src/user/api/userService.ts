/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";

export interface OrganizationSummaryDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  roleNames: string[];
}

export interface UserDTO {
  id: string;
  fullName: string;
  userName: string;
  email: string;
  avatarUrl: string;
  createdAt: string;
  isSuperadmin: boolean;
  activeOrganizationSlug: string;
  activeOrganizationName: string;
  organizations: OrganizationSummaryDto[];
  permissions: string[];
}

export const getProfile = (): Promise<UserDTO> => appFetch<UserDTO>("/api/user/profile");

export const logout = (): Promise<void> => appFetch<void>("/api/auth/logout", { method: "POST" });
