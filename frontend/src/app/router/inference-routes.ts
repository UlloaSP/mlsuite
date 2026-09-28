import type { RouteObject } from "react-router";
import { lazyPage, workspacePage } from "./lazy-route";

export const inferenceRoutes: RouteObject[] = [
  {
    path: "inferences",
    lazy: () =>
      lazyPage(
        () => import("@/app/pages/InferencesRoutePage"),
        "InferencesRoutePage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "inferences/:inferenceId",
    lazy: () =>
      lazyPage(
        () => import("@/app/pages/InferenceDetailRoutePage"),
        "InferenceDetailRoutePage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "inferences/:inferenceId/reviews/:reviewRunId/reviewers/:reviewerId",
    lazy: () =>
      lazyPage(
        () => import("@/app/pages/InferenceReviewRoutePage"),
        "InferenceReviewRoutePage",
        workspacePage("canManageReviews"),
      ),
  },
];
