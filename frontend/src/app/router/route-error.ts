/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRouteErrorResponse } from "react-router";
import { isHttpError } from "@/shared/api/http";
import type { RouteStatus } from "@/shared/ui/RouteStatusPage";

export type RouteErrorStatus = RouteStatus;

export const classifyRouteError = (error: unknown): RouteErrorStatus => {
  const status = isRouteErrorResponse(error)
    ? error.status
    : isHttpError(error)
      ? error.status
      : 500;
  if (status === 403 || status === 404 || status === 0) return status;
  if (
    error instanceof Error &&
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      error.message,
    )
  ) {
    return "module-load";
  }
  return 500;
};
