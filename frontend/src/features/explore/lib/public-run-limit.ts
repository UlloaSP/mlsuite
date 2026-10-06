/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isHttpError } from "@/shared/api/http";
import type { PublicRunLimitDto } from "@/shared/api/openapi.gen";

/**
 * The quota that came with a run refused because the caller has none left on the bookmark,
 * or null when the error is anything else. That refusal is not a failure to explain: the page
 * shows the used-up quota in place of the run action.
 */
export const publicRunLimitQuota = (error: unknown): PublicRunLimitDto["quota"] | null => {
  if (!isHttpError(error) || error.status !== 429) return null;
  const { quota } = error.dto as Partial<PublicRunLimitDto>;
  return quota && typeof quota.limit === "number" ? quota : null;
};
