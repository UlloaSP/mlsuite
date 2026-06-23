/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SearchGroupDto } from "./index";

export interface SearchResponseDto {
  query: string;
  groups: SearchGroupDto[];
}
