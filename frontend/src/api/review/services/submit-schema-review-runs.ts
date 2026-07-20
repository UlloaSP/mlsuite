/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";

export const submitSchemaReviewRuns = (token: string, runTokens: string[]) =>
  appFetch<void>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/submit`,
    json("POST", { runTokens }),
  );
