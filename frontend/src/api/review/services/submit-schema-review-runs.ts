/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";

export const submitSchemaReviewRuns = (token: string, runTokens: string[]) =>
  appFetch<void>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/submit`,
    json("POST", { runTokens }),
  );
