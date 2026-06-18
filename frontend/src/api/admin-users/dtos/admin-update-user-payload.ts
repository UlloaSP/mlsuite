/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export type AdminUpdateUserPayload = {
  username?: string;
  fullName?: string;
  systemRole?: "USER" | "SUPERADMIN";
  enabled?: boolean;
};
