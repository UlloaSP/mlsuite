/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { SchemaDto, CreateSchemaRequest } from "@/api/schemas/dtos";

export const createSchema = (req: CreateSchemaRequest): Promise<SchemaDto> =>
  appFetch<SchemaDto>("/api/schemas", json("POST", req));
