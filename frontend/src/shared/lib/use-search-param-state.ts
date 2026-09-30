/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback } from "react";
import { useSearchParams } from "react-router";

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
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = raw !== null && (!allowed || allowed.includes(raw as T)) ? (raw as T) : fallback;

  const setValue = useCallback(
    (next: T) =>
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (next === fallback) updated.delete(key);
          else updated.set(key, next);
          return updated;
        },
        { replace: true },
      ),
    [fallback, key, setParams],
  );

  return [value, setValue] as const;
}
