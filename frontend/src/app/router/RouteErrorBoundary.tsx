/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useRouteError } from "react-router";
import { RouteStatusPage } from "@/app/pages/error-page";
import { classifyRouteError } from "./route-error";

export function RouteErrorBoundary() {
  const error = useRouteError();
  return <RouteStatusPage status={classifyRouteError(error)} />;
}
