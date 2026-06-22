/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import { GET_MODELS_QUERY_KEY, MODEL_CATALOG_PAGE_QUERY_KEY } from "./query-keys";

export const useInvalidateModelQueries = () => {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: GET_MODELS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MODEL_CATALOG_PAGE_QUERY_KEY }),
    ]);
  };
};
