/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { SCHEMA_BOOKMARKS_QUERY_KEY } from "./query-keys";

export const useSchemaBookmarks = (schemaId?: string) =>
  useQuery({
    queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(schemaId ?? ""),
    queryFn: () => schemaApi.getSchemaBookmarks(schemaId ?? ""),
    enabled: Boolean(schemaId),
    placeholderData: [],
  });
