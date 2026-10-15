/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { OUTCOME_TONE, outcomeLabel, outcomeOf } from "@/features/api-access/lib/api-format";
import { AppBadge } from "@/shared/ui/AppBadge";
import type { ApiRequestDto } from "@/shared/api/openapi.gen";

/** The status and problem code a call was answered with, written as the client read them. */
export function RequestOutcomeBadge({ request }: { request: ApiRequestDto }) {
  return (
    <AppBadge tone={OUTCOME_TONE[outcomeOf(request.status)]}>
      {/* Wrapped so AppBadge keeps the code as written instead of sentence-casing it. */}
      <span className="font-mono">{outcomeLabel(request)}</span>
    </AppBadge>
  );
}
