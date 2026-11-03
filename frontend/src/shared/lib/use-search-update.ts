/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useNavigate } from "@tanstack/react-router";

/**
 * Changes some of the current page's search params and keeps the rest. `TSearch` is the search
 * the page's route validated (`route.useSearch()`), so each change is checked against it. Each
 * change starts from the address the router is about to show, so changes made before the next
 * render all apply. A change replaces the history entry unless told to add one.
 */
export function useSearchUpdate<TSearch extends object>() {
  const navigate = useNavigate();
  return (change: Partial<TSearch>, { replace = true }: { replace?: boolean } = {}) =>
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, ...change }) as typeof previous,
      replace,
    });
}
