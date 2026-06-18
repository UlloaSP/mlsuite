/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export type AdminUserDto = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  systemRole: "USER" | "SUPERADMIN";
  enabled: boolean;
  createdAt: string;
};
