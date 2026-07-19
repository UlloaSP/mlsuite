/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { CreateSchemaReviewLinkRequest, SchemaReviewLinkCreateResponse } from "@/api/review/dtos";

export const createSchemaReviewLink = (request: CreateSchemaReviewLinkRequest) =>
  appFetch<SchemaReviewLinkCreateResponse>("/api/schema-review-links", json("POST", request));
