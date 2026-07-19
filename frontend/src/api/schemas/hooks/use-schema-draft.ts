/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import { SCHEMA_DRAFT_QUERY_KEY } from "./query-keys";

export const useSchemaDraft = (draftId?: string) =>
  useQuery({
    queryKey: SCHEMA_DRAFT_QUERY_KEY(draftId ?? ""),
    queryFn: () => schemaApi.getSchemaDraft(draftId ?? ""),
    enabled: Boolean(draftId),
  });
