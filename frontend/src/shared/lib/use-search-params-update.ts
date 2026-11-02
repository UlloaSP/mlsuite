/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback } from "react";
import { useLocation, useNavigate, type Location } from "react-router";

/**
 * The last update made while the router still shows `location`. React Router hands a functional
 * setSearchParams the params of the last render, so two updates before the next render, from one
 * component or two, would both start from it and the second would drop the first.
 */
let pending: { location: Location; search: string } | null = null;

/**
 * Changes some search params and keeps the rest. Each change starts from the previous one until
 * the router renders the new URL, so simultaneous changes all apply.
 */
export function useSearchParamsUpdate() {
  const location = useLocation();
  const navigate = useNavigate();
  return useCallback(
    (change: (params: URLSearchParams) => void, { replace = true }: { replace?: boolean } = {}) => {
      const params = new URLSearchParams(
        pending?.location === location ? pending.search : location.search,
      );
      change(params);
      const search = params.toString();
      pending = { location, search };
      void navigate(`?${search}`, { replace });
    },
    [location, navigate],
  );
}
