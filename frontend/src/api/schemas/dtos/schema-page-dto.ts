/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaDto } from "./index";

export interface SchemaPageDto {
  items: SchemaDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}
