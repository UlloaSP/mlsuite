/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { SCHEMA_VERSIONS_QUERY_KEY } from "./query-keys";

export const useSchemaVersions = (schemaId?: string) =>
  useQuery({
    queryKey: SCHEMA_VERSIONS_QUERY_KEY(schemaId ?? ""),
    queryFn: () => schemaApi.getSchemaVersions(schemaId ?? ""),
    enabled: Boolean(schemaId),
    placeholderData: [],
  });
