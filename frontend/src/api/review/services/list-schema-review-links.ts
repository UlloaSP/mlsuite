/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaReviewLinkSummaryDto } from "@/api/review/dtos";

export const listSchemaReviewLinks = (schemaId: string, versionId: string, signal?: AbortSignal) =>
  appFetch<SchemaReviewLinkSummaryDto[]>(
    `/api/schema-review-links?schemaId=${encodeURIComponent(schemaId)}&versionId=${encodeURIComponent(versionId)}`,
    { signal },
  );
