/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaDto, SchemaNameRequest } from "../dtos";

export const renameSchema = ({ id, name }: SchemaNameRequest): Promise<SchemaDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(id)}?${params.toString()}`, {
    method: "PATCH",
  });
};
