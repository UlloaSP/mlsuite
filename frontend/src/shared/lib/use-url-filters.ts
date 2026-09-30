import { useSearchParams } from "react-router";

/**
 * Navigable list filters kept in the URL. Defaults and empty values stay out of the URL,
 * changes replace the history entry, and every change drops `page` so the list restarts.
 */
export function useUrlFilters<K extends string>(defaults: Record<K, string>) {
  const [params, setParams] = useSearchParams();
  const keys = Object.keys(defaults) as K[];
  const values = Object.fromEntries(
    keys.map((key) => [key, params.get(key) ?? defaults[key]]),
  ) as Record<K, string>;

  const setFilters = (changes: Partial<Record<K, string>>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes) as Array<[K, string]>) {
          if (value === "" || value === defaults[key]) next.delete(key);
          else next.set(key, value);
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );

  return {
    values,
    setFilters,
    isFiltered: keys.some((key) => values[key] !== defaults[key]),
  };
}
