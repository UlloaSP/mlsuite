/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { rootRoute } from "./layout-routes";
import { protectedRoutes } from "./protected-routes";
import { publicRoutes, sessionFrameRoutes } from "./public-routes";
import { parseSearch, stringifySearch } from "./search-params";

export const routeTree = rootRoute.addChildren([publicRoutes, sessionFrameRoutes, protectedRoutes]);

/**
 * The app's router. Every navigation is a view transition unless it opts out, an address no
 * route matches renders the root's not-found page, and search params stay plain strings.
 */
export const createAppRouter = (history?: RouterHistory) =>
  createRouter({
    routeTree,
    history,
    defaultViewTransition: true,
    notFoundMode: "root",
    parseSearch,
    stringifySearch,
  });

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
  interface HistoryState {
    /** Returning to a section rather than visiting it anew: restore its last scroll. */
    restoreScroll?: true;
  }
}
