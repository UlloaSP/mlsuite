import { useEffect, useState } from "react";

/** Typing delay shared by every search that asks the server. */
export const SEARCH_DEBOUNCE_MS = 250;

export const useDebouncedValue = (value: string, delayMs = SEARCH_DEBOUNCE_MS) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  // Clearing the search is a decision, not typing: it applies at once.
  return value === "" ? value : debounced;
};
