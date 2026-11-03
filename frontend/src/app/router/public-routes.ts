/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createRoute, redirect, type AnyRouter } from "@tanstack/react-router";
import { z } from "zod";
import { EXPLORE_PATH } from "@/app/components/explore-navigation";
import { AUTH_MODES } from "@/app/pages/auth-landing/authLandingCopy";
import { SIGN_IN_PATH } from "@/capabilities/workspace-context/session";
import {
  publicBookmarkCatalogQueryOptions,
  publicBookmarkQueryOptions,
} from "@/features/explore/api/public-bookmark-api";
import { exploreSearch } from "@/features/explore/pages/explore-search";
import { publicProfileQueryOptions } from "@/features/user/api/profile-api";
import { choiceParam, optionalTextParam } from "@/shared/lib/search-schema";
import { publicRoute, sessionFrameRoute } from "./layout-routes";
import { page, searchPage } from "./lazy-route";

/** `/` has no page of its own: with or without a session, it opens the public feed. */
const indexRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: EXPLORE_PATH, replace: true });
  },
});

/** Sign-in and registration: `?mode=register` opens the second, `?returnTo=` where to go next. */
const signInSearch = z.object({
  mode: choiceParam(AUTH_MODES, "login"),
  returnTo: optionalTextParam(),
});

export const publicRoutes = publicRoute.addChildren([
  indexRoute,
  searchPage(publicRoute, SIGN_IN_PATH, signInSearch, () =>
    import("@/app/pages/AuthLandingPage").then((m) => m.AuthLandingPage),
  ),
]);

/** Whether `path` opens one of them: a page a visitor can go back to without a session. */
export const isPublicPage = (router: AnyRouter, path: string) => {
  const [matched, , found] = router.getMatchedRoutes(new URL(path, "https://app.invalid").pathname);
  return found !== undefined && matched.some((route) => route.id === sessionFrameRoute.id);
};

/**
 * Pages anyone can open. SessionFrameLayout frames them; they never require a session. Their
 * data is public, so their loaders read it for member and visitor alike.
 */
export const sessionFrameRoutes = sessionFrameRoute.addChildren([
  searchPage(
    sessionFrameRoute,
    "explore",
    exploreSearch,
    () => import("@/features/explore/pages/explore-page").then((m) => m.ExplorePage),
    ({ queryClient, search: { q, sort } }) =>
      queryClient.prefetchInfiniteQuery(publicBookmarkCatalogQueryOptions(q.trim(), sort)),
  ),
  page(
    sessionFrameRoute,
    "explore/$publicId",
    () => import("@/features/explore/pages/public-bookmark-page").then((m) => m.PublicBookmarkPage),
    ({ queryClient, params: { publicId } }) =>
      queryClient.prefetchQuery(publicBookmarkQueryOptions(publicId)),
  ),
  page(
    sessionFrameRoute,
    "u/$handle",
    () => import("@/features/user/pages/public-profile-page").then((m) => m.PublicProfilePage),
    ({ queryClient, params: { handle } }) =>
      queryClient.prefetchQuery(publicProfileQueryOptions(handle)),
  ),
]);
