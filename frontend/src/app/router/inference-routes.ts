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
        () => import("@/features/inferences/pages/inference-detail-page"),
        "InferenceDetailPage",
        workspacePage("canViewModels"),
      ),
  },
];
