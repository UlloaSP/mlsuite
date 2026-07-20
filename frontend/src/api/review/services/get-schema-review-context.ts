/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaReviewLinkContextDto } from "@/api/review/dtos";

export const getSchemaReviewContext = (token: string, signal?: AbortSignal) =>
  appFetch<SchemaReviewLinkContextDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/context`,
    { signal },
  );
