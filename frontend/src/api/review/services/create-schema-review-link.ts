/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { CreateSchemaReviewLinkRequest, SchemaReviewLinkCreateResponse } from "@/api/review/dtos";

export const createSchemaReviewLink = (request: CreateSchemaReviewLinkRequest) =>
  appFetch<SchemaReviewLinkCreateResponse>("/api/schema-review-links", json("POST", request));
