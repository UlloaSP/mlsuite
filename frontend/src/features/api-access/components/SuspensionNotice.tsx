/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { formatTimestamp } from "@/shared/lib/date-time";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import type { ApiClientSummaryDto } from "@/shared/api/openapi.gen";

/**
 * Why the platform suspended the client. Its calls are refused and it takes no new key or
 * bookmark; only a platform administrator reinstates it.
 */
export function SuspensionNotice({ client }: { client: ApiClientSummaryDto }) {
  if (client.status !== "SUSPENDED") return null;
  return (
    <AppInlineAlert>
      The platform suspended this client
      {client.suspendedAt ? ` on ${formatTimestamp(client.suspendedAt)}` : ""}:{" "}
      {(client.suspensionReason ?? "no reason was given").replace(/[.!?]+$/, "")}. Its calls are
      refused and it cannot be given new keys or bookmarks. Contact a platform administrator to
      reinstate it.
    </AppInlineAlert>
  );
}
