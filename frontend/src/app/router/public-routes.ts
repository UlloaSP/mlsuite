/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { matchRoutes, type RouteObject } from "react-router";
import { page } from "./lazy-route";

/** Pages anyone can open. SessionFrameLayout frames them; they never require a session. */
export const publicPages: RouteObject[] = [
  page("explore", () => import("@/features/explore/pages/explore-page").then((m) => m.ExplorePage)),
  page("explore/:publicId", () =>
    import("@/features/explore/pages/public-bookmark-page").then((m) => m.PublicBookmarkPage),
  ),
];

/** Whether `path` opens one of them: a page a visitor can go back to without a session. */
export const isPublicPage = (path: string) => matchRoutes(publicPages, path) !== null;
