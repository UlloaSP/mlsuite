/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { SchemaVersionDto, CreateSchemaVersionRequest } from "@/api/schemas/dtos";

export const createSchemaVersion = (
  schemaId: string,
  req: CreateSchemaVersionRequest,
): Promise<SchemaVersionDto> =>
  appFetch<SchemaVersionDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/versions`,
    json("POST", req),
  );
