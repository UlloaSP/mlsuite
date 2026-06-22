/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaReviewRunDetailDto } from "../dtos";

export const getSchemaReviewRunDetail = (token: string, runToken: string) =>
  appFetch<SchemaReviewRunDetailDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/runs/${encodeURIComponent(runToken)}`,
  );
