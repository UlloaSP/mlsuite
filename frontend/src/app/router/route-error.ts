/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRouteErrorResponse } from "react-router";
import { isHttpError } from "@/shared/api/http";

export type RouteErrorStatus = 0 | 403 | 404 | 500;

export const classifyRouteError = (error: unknown): RouteErrorStatus => {
  const status = isRouteErrorResponse(error)
    ? error.status
    : isHttpError(error)
      ? error.status
      : 500;
  if (status === 403 || status === 404 || status === 0) return status;
  if (
    error instanceof Error &&
    error.message.includes("Failed to fetch dynamically imported module")
  ) {
    return 0;
  }
  return 500;
};
