/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface ModelDto {
  id: string;
  name: string;
  type: string;
  specificType: string;
  fileName: string;
  inputSchema: Record<string, unknown>;
  createdAt: string;
}
