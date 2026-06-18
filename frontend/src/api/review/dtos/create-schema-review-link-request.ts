/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export type CreateSchemaReviewLinkRequest = {
  schemaId: string;
  versionId: string;
  runIds: string[];
  expiresAt?: string;
};
