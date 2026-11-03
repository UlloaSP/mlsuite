/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

/** The current address's search params, as the browser has them. */
export function useUrlSearchParams() {
  const search = useLocation({ select: (location) => location.searchStr });
  return useMemo(() => new URLSearchParams(search), [search]);
}

/**
 * Changes some search params and keeps the rest and the page. Each change starts from the
 * address the router is about to show, so changes made before the next render all apply.
 */
export function useSearchParamsUpdate() {
  const navigate = useNavigate();
  return useCallback(
    (change: (params: URLSearchParams) => void, { replace = true }: { replace?: boolean } = {}) =>
      void navigate({
        to: ".",
        search: (previous) => {
          const params = new URLSearchParams(previous as Record<string, string>);
          change(params);
          return Object.fromEntries(params);
        },
        replace,
      }),
    [navigate],
  );
}
