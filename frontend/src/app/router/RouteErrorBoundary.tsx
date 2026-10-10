/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useRouteError } from "react-router";
import { RouteStatusPage } from "@/app/pages/error-page";
import { useWarnOnUnsavedInferences } from "@/features/schemas/lib/inference-session-store";
import { classifyRouteError } from "./route-error";

export function RouteErrorBoundary() {
  const error = useRouteError();
  useWarnOnUnsavedInferences();
  return <RouteStatusPage status={classifyRouteError(error)} />;
}
