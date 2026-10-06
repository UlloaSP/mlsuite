/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { RouteObject } from "react-router";
import { page } from "./lazy-route";

/** Pages anyone can open. SessionFrameLayout frames them; they never require a session. */
export const publicPages: RouteObject[] = [
  page("explore", () => import("@/features/explore/pages/explore-page").then((m) => m.ExplorePage)),
  page("explore/:publicId", () =>
    import("@/features/explore/pages/public-bookmark-page").then((m) => m.PublicBookmarkPage),
  ),
];
