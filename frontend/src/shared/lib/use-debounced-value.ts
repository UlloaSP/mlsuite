import { useDebouncedValue as usePacerDebouncedValue } from "@tanstack/react-pacer/debouncer";

/** Typing delay shared by every search that asks the server. */
export const SEARCH_DEBOUNCE_MS = 250;

export const useDebouncedValue = (value: string, delayMs = SEARCH_DEBOUNCE_MS) => {
  const [debounced] = usePacerDebouncedValue(value, { wait: delayMs });

  // Clearing the search is a decision, not typing: it applies at once.
  return value === "" ? value : debounced;
};
