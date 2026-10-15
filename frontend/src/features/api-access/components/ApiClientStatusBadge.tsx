/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import type { ApiClientSummaryDto } from "@/shared/api/openapi.gen";

/** Active, or suspended by the platform, which only the platform undoes. */
export function ApiClientStatusBadge({ status }: { status: ApiClientSummaryDto["status"] }) {
  return status === "SUSPENDED" ? (
    <AppBadge tone="danger">Suspended by the platform</AppBadge>
  ) : (
    <AppBadge tone="success">Active</AppBadge>
  );
}
