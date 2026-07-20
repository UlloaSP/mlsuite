/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";

export const revokeSchemaReviewLink = (id: number) =>
  appFetch<void>(`/api/schema-review-links/${id}/revoke`, json("POST"));
