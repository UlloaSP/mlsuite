/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { SCHEMA_BOOKMARK_QUERY_KEY } from "./query-keys";

export const useSchemaBookmark = (bookmarkId?: string) =>
  useQuery({
    queryKey: SCHEMA_BOOKMARK_QUERY_KEY(bookmarkId ?? ""),
    queryFn: () => schemaApi.getSchemaBookmark(bookmarkId ?? ""),
    enabled: Boolean(bookmarkId),
  });
