/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export type AdminCreateUserPayload = {
  email: string;
  password: string;
  fullName: string;
  username?: string;
  systemRole?: "USER" | "SUPERADMIN";
  enabled?: boolean;
};
