/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ModelDto } from "./index";

export interface ModelPageDto {
  items: ModelDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}
