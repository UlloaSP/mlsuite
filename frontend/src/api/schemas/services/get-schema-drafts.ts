/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaDraftDto } from "../dtos";

export const getSchemaDrafts = (schemaId: string): Promise<SchemaDraftDto[]> =>
  appFetch<SchemaDraftDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/drafts`);
