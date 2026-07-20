/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { SchemaDto, CreateSchemaRequest } from "@/api/schemas/dtos";

export const createSchema = (req: CreateSchemaRequest): Promise<SchemaDto> =>
  appFetch<SchemaDto>("/api/schemas", json("POST", req));
