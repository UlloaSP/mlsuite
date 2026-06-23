/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaDto } from "../dtos";

export const getSchemas = (): Promise<SchemaDto[]> => appFetch<SchemaDto[]>("/api/schemas/all");
