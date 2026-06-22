/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import { SCHEMA_CATALOG_PAGE_QUERY_KEY, SCHEMAS_QUERY_KEY } from "./query-keys";

export const useInvalidateSchemaQueries = () => {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SCHEMAS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: SCHEMA_CATALOG_PAGE_QUERY_KEY }),
    ]);
  };
};
