/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback } from "react";
import { useSearchParamsUpdate, useUrlSearchParams } from "@/shared/lib/url-search-params";

/**
 * A view choice (tab, mode, filter) kept in the URL, so back/forward, reloads,
 * and shared links return to it. The default value is left out of the URL, and
 * changes replace the history entry instead of adding one per click.
 */
export function useSearchParamState<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
) {
  const params = useUrlSearchParams();
  const update = useSearchParamsUpdate();
  const raw = params.get(key);
  const value = raw !== null && (!allowed || allowed.includes(raw as T)) ? (raw as T) : fallback;

  const setValue = useCallback(
    (next: T) =>
      update((params) => {
        if (next === fallback) params.delete(key);
        else params.set(key, next);
      }),
    [fallback, key, update],
  );

  return [value, setValue] as const;
}
