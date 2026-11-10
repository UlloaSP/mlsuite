/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { rootRoute } from "./layout-routes";
import { protectedRoutes } from "./protected-routes";
import { publicRoutes, sessionFrameRoutes } from "./public-routes";
import { parseSearch, stringifySearch } from "./search-params";

export const routeTree = rootRoute.addChildren([publicRoutes, sessionFrameRoutes, protectedRoutes]);

/**
 * The app's router. A navigation shows the next page in place, with no transition between the
 * two; an address no route matches renders the root's not-found page, and search params stay
 * plain strings.
 * Loaders fill `queryClient`, which owns caching, so every preload or navigation asks it and a
 * link preloads its page and data while the pointer rests on it.
 */
export const createAppRouter = (queryClient: QueryClient, history?: RouterHistory) =>
  createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    notFoundMode: "root",
    parseSearch,
    stringifySearch,
  });

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
  interface HistoryState {
    /** Returning to a section rather than visiting it anew: restore its last scroll. */
    restoreScroll?: true;
  }
}
