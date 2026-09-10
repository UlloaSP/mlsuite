import type { RouteObject } from "react-router";
import { lazyPage, reviewAccess } from "./lazy-route";

export const reviewRoutes: RouteObject[] = [
  {
    path: "review",
    lazy: () =>
      lazyPage(() => import("@/features/reviews/pages/reviews-page"), "ReviewsPage", reviewAccess),
  },
  {
    path: "review/:reviewId",
    lazy: () =>
      lazyPage(() => import("@/features/reviews/pages/reviews-page"), "ReviewsPage", reviewAccess),
  },
  {
    path: "review/:reviewId/runs/:reviewRunId",
    lazy: () =>
      lazyPage(() => import("@/features/reviews/pages/reviews-page"), "ReviewsPage", reviewAccess),
  },
];
