import { useSearchParamsUpdate, useUrlSearchParams } from "@/shared/lib/url-search-params";

/**
 * Navigable list filters kept in the URL. Defaults and empty values stay out of the URL,
 * and changes replace the history entry.
 */
export function useUrlFilters<K extends string>(defaults: Record<K, string>) {
  const params = useUrlSearchParams();
  const update = useSearchParamsUpdate();
  const keys = Object.keys(defaults) as K[];
  const values = Object.fromEntries(
    keys.map((key) => [key, params.get(key) ?? defaults[key]]),
  ) as Record<K, string>;

  const setFilters = (changes: Partial<Record<K, string>>) =>
    update((next) => {
      for (const [key, value] of Object.entries(changes) as Array<[K, string]>) {
        if (value === "" || value === defaults[key]) next.delete(key);
        else next.set(key, value);
      }
    });

  return {
    values,
    setFilters,
    isFiltered: keys.some((key) => values[key] !== defaults[key]),
  };
}
