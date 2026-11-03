/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RouteStatusPage } from "@/app/pages/error-page";
import { useWarnOnUnsavedInferences } from "@/features/schemas/lib/inference-session-store";
import { classifyRouteError } from "./route-error";

export function RouteErrorBoundary({ error }: { error: unknown }) {
  useWarnOnUnsavedInferences();
  return <RouteStatusPage status={classifyRouteError(error)} />;
}
