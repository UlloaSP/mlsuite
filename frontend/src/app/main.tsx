/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { AppProviders } from "./providers/AppProviders";
import { createAppQueryClient } from "./providers/query-client";
import { router } from "./router/routes";

const queryClient = createAppQueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppProviders queryClient={queryClient}>
    <RouterProvider router={router} />
  </AppProviders>,
);
