/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { KeyRound, Tag } from "lucide-react";
import { ApiClientStatusBadge } from "@/features/api-access/components/ApiClientStatusBadge";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { ApiClientSummaryDto } from "@/shared/api/openapi.gen";

const ClientIcon = SECTION_ICONS.api;

const counted = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** A client in its organization's catalog; it opens the client's page. */
export function ApiClientEntry({ client }: { client: ApiClientSummaryDto }) {
  return (
    <CatalogEntry
      title={client.name}
      titleAccessory={<ApiClientStatusBadge status={client.status} />}
      icon={<ClientIcon size={16} className="mt-1 text-fg-secondary" />}
      description={client.description ?? undefined}
      metadata={
        <>
          <span className="inline-flex items-center gap-1">
            <Tag size={14} />
            {counted(client.bookmarkCount, "bookmark", "bookmarks")}
          </span>
          <span className="inline-flex items-center gap-1">
            <KeyRound size={14} />
            {counted(client.keyCount, "key", "keys")}
          </span>
          <span>
            {client.lastUsedAt ? (
              <>
                Last successful call <LiveRelativeTime value={client.lastUsedAt} /> ago
              </>
            ) : (
              "No successful calls yet"
            )}
          </span>
        </>
      }
      to={`/api-access/clients/${client.id}`}
    />
  );
}
