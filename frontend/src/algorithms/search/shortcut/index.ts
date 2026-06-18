/**
 * SearchShortcutEvent: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: detects global keyboard shortcuts for workspace search.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type SearchShortcutEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

/**
 * isGlobalSearchShortcut: returns a boolean guard/result for the requested predicate
 *
 * Purpose: detects global keyboard shortcuts for workspace search.
 * @param event - Input consumed by isGlobalSearchShortcut; uses the detects global keyboard shortcuts for workspace search contract.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const isGlobalSearchShortcut = (event: SearchShortcutEvent) =>
  event.key.toLowerCase() === "k" &&
  (event.ctrlKey === true || event.metaKey === true) &&
  event.altKey !== true &&
  event.shiftKey !== true;
