/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface ModelPageRequest {
  page: number;
  search?: string;
  size: number;
  sort?: string;
  status?: string;
}
