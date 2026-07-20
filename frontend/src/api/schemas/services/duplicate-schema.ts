/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { DuplicateSchemaRequest, SchemaDto } from "@/api/schemas/dtos";

export const duplicateSchema = ({
  id,
  name,
  versionId,
}: DuplicateSchemaRequest): Promise<SchemaDto> => {
  const params = new URLSearchParams({ name });
  if (versionId) params.set("versionId", versionId);
  return appFetch<SchemaDto>(
    `/api/schemas/${encodeURIComponent(id)}/duplicate?${params.toString()}`,
    { method: "POST" },
  );
};
