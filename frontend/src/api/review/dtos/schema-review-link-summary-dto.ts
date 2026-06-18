/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export type SchemaReviewLinkSummaryDto = {
  id: number;
  schemaId: string;
  versionId: string;
  createdByEmail: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  token?: string | null;
  runCount: number;
};
