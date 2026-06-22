/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PermissionKey } from "./index";

export interface PermissionDto {
  key: PermissionKey;
  label: string;
  description: string;
  dangerous: boolean;
}
