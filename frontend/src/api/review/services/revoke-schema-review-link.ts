/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";

export const revokeSchemaReviewLink = (id: number) =>
  appFetch<void>(`/api/schema-review-links/${id}/revoke`, json("POST"));
