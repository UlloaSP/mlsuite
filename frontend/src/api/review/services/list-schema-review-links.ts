/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaReviewLinkSummaryDto } from "../dtos";

export const listSchemaReviewLinks = (schemaId: string, versionId: string) =>
  appFetch<SchemaReviewLinkSummaryDto[]>(
    `/api/schema-review-links?schemaId=${encodeURIComponent(schemaId)}&versionId=${encodeURIComponent(versionId)}`,
  );
