/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { RoleScope } from "./index";

export interface RoleSummaryDto {
  id: number | null;
  name: string;
  slug: string;
  scope: RoleScope;
  locked: boolean;
  systemKey?: string | null;
}
