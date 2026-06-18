/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export interface UserDTO {
  id: string;
  fullName: string;
  userName: string;
  email: string;
  avatarUrl: string | null;
  location?: string;
  systemRole: "USER" | "SUPERADMIN";
  enabled: boolean;
  createdAt: string;
}
