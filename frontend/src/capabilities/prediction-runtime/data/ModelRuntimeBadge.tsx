/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import type { ModelDto } from "@/shared/api/openapi.gen";

/** A model that cannot run yet, or any more, says so; a ready model shows nothing. */
export function ModelRuntimeBadge({
  state,
  className,
}: {
  state: ModelDto["runtimeState"];
  className?: string;
}) {
  if (state === "PREPARING")
    return (
      <AppBadge tone="info" className={className}>
        Preparing environment
      </AppBadge>
    );
  if (state === "FAILED")
    return (
      <AppBadge tone="danger" className={className}>
        Environment failed
      </AppBadge>
    );
  return null;
}
