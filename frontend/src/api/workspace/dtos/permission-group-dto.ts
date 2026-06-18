/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PermissionDto } from "./index";

export interface PermissionGroupDto {
  name: string;
  permissions: PermissionDto[];
}
