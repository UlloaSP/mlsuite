/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaReviewLinkContextDto } from "../dtos";

export const getSchemaReviewContext = (token: string) =>
  appFetch<SchemaReviewLinkContextDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/context`,
  );
