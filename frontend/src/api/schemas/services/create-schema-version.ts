/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { SchemaVersionDto, CreateSchemaVersionRequest } from "@/api/schemas/dtos";

export const createSchemaVersion = (
  schemaId: string,
  req: CreateSchemaVersionRequest,
): Promise<SchemaVersionDto> =>
  appFetch<SchemaVersionDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/versions`,
    json("POST", req),
  );
