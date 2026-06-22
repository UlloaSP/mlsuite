/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaReviewRunListItemDto } from "./index";
import type { SchemaDto, SchemaVersionDto } from "../../schemas/dtos";

export type SchemaReviewLinkContextDto = {
  organization: { id: number; name: string };
  schema: SchemaDto;
  schemaVersion: SchemaVersionDto;
  runs: SchemaReviewRunListItemDto[];
};
