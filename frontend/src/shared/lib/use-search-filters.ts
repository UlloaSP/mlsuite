/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSearchUpdate } from "@/shared/lib/use-search-update";

/**
 * A list's filters kept in the URL: `search` is what the page's route validated, and `schema`
 * the route's search schema, whose fallbacks (what an empty search parses to) are the unfiltered
 * list. Changes replace the history entry.
 */
export function useSearchFilters<TSearch extends object>(
  search: TSearch,
  schema: { parse: (input: object) => TSearch },
) {
  const update = useSearchUpdate<TSearch>();
  const fallbacks = schema.parse({});
  return {
    values: search,
    setFilters: (changes: Partial<TSearch>) => update(changes),
    isFiltered: (Object.keys(fallbacks) as (keyof TSearch)[]).some(
      (key) => search[key] !== fallbacks[key],
    ),
  };
}
