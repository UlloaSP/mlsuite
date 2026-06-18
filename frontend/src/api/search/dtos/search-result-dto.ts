/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SearchResultType } from "./index";

export interface SearchResultDto {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  organizationId?: number | null;
  teamId?: number | null;
  modelId?: number | null;
}
