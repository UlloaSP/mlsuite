/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSyncExternalStore } from "react";

/** Whether a CSS media query currently matches, kept in sync with the viewport. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia?.(query);
      media?.addEventListener?.("change", onChange);
      return () => media?.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia?.(query)?.matches ?? false,
    () => false,
  );
}
