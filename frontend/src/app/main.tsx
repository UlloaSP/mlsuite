/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import "@/shared/ui/default-font-faces";
import { ignoreSkippedViewTransitions } from "@/shared/ui/skipped-view-transition";
import { AppProviders } from "./providers/AppProviders";
import { createAppQueryClient } from "./providers/query-client";
import { createAppRouter } from "./router/routes";

ignoreSkippedViewTransitions(window);
const queryClient = createAppQueryClient();
const router = createAppRouter(queryClient);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppProviders queryClient={queryClient}>
    <RouterProvider router={router} />
  </AppProviders>,
);
