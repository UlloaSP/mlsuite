/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { SCHEMA_DRAFTS_QUERY_KEY } from "./query-keys";

export const useSchemaDrafts = (schemaId?: string) =>
  useQuery({
    queryKey: SCHEMA_DRAFTS_QUERY_KEY(schemaId ?? ""),
    queryFn: () => schemaApi.getSchemaDrafts(schemaId ?? ""),
    enabled: Boolean(schemaId),
  });
