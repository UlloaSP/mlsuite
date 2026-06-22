/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { SchemaDto, CreateSchemaRequest } from "../dtos";

export const createSchema = (req: CreateSchemaRequest): Promise<SchemaDto> =>
  appFetch<SchemaDto>("/api/schemas", json("POST", req));
