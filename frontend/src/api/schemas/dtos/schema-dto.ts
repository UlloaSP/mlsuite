/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDto = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
};
