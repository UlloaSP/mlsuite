/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

/** Every page, and in development the router's devtools beside them. */
export function AppRoot() {
  return (
    <>
      <Outlet />
      {/* Renders nothing outside development, so production bundles leave it out. */}
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
