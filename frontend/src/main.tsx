/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "jotai";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { Toaster } from "sonner";
import { StartupGate } from "./app/startup/StartupGate";
import { createAppQueryClient } from "./app/query-client";
import { router } from "./router/routes";

const queryClient = createAppQueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider>
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            <StartupGate>
              <RouterProvider router={router} />
              <Toaster
                position="top-center"
                toastOptions={{
                  classNames: {
                    toast:
                      "rounded-lg border border-neutral-200 bg-white text-neutral-950 shadow-lg",
                    title: "text-sm font-medium",
                    description: "text-sm text-neutral-600",
                    actionButton:
                      "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white",
                    cancelButton:
                      "rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950",
                    closeButton: "border-neutral-200 bg-white text-neutral-950",
                  },
                }}
              />
            </StartupGate>
          </MotionConfig>
        </LazyMotion>
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);
