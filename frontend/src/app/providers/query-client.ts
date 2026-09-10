/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { emitErrorFromUnknown } from "@/shared/api/error-notifications";

export const createAppQueryClient = (
  reportError: (error: unknown) => void = emitErrorFromUnknown,
) =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.queryKey[0] !== "user") reportError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.errorHandledLocally !== true) reportError(error);
      },
    }),
    defaultOptions: {
      queries: { staleTime: 5 * 60_000, retry: 1 },
    },
  });
