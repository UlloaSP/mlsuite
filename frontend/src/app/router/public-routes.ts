/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createRoute, redirect, type AnyRouter } from "@tanstack/react-router";
import { EXPLORE_PATH } from "@/app/components/explore-navigation";
import { SIGN_IN_PATH } from "@/capabilities/workspace-context/session";
import { publicRoute, sessionFrameRoute } from "./layout-routes";
import { page } from "./lazy-route";

/** `/` has no page of its own: with or without a session, it opens the public feed. */
const indexRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: EXPLORE_PATH, replace: true });
  },
});

export const publicRoutes = publicRoute.addChildren([
  indexRoute,
  page(publicRoute, SIGN_IN_PATH, () =>
    import("@/app/pages/AuthLandingPage").then((m) => m.AuthLandingPage),
  ),
]);

/** Whether `path` opens one of them: a page a visitor can go back to without a session. */
export const isPublicPage = (router: AnyRouter, path: string) => {
  const [matched, , found] = router.getMatchedRoutes(new URL(path, "https://app.invalid").pathname);
  return found !== undefined && matched.some((route) => route.id === sessionFrameRoute.id);
};

/** Pages anyone can open. SessionFrameLayout frames them; they never require a session. */
export const sessionFrameRoutes = sessionFrameRoute.addChildren([
  page(sessionFrameRoute, "explore", () =>
    import("@/features/explore/pages/explore-page").then((m) => m.ExplorePage),
  ),
  page(sessionFrameRoute, "explore/$publicId", () =>
    import("@/features/explore/pages/public-bookmark-page").then((m) => m.PublicBookmarkPage),
  ),
  page(sessionFrameRoute, "u/$handle", () =>
    import("@/features/user/pages/public-profile-page").then((m) => m.PublicProfilePage),
  ),
]);
