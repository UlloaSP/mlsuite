/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SearchResultDto } from "./index";

export interface SearchGroupDto {
  label: string;
  results: SearchResultDto[];
}
