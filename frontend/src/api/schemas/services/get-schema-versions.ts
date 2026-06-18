/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaVersionDto } from "../dtos";

export const getSchemaVersions = (schemaId: string): Promise<SchemaVersionDto[]> =>
  appFetch<SchemaVersionDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/versions`);
