/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { formatCount, formatShare } from "@/features/api-access/lib/api-format";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import type { ApiClientCalls } from "@/shared/api/openapi.gen";

type Props = {
  clients: ApiClientCalls[];
  /** Where a client's row leads; absent on the platform's view, which has no client page. */
  clientHref?: (clientId: number) => string;
};

/** The clients that called most in the period, with the share of their calls that went wrong. */
export function TopClientsList({ clients, clientHref }: Props) {
  if (clients.length === 0) {
    return <AppEmptyState compact title="No calls in this period" />;
  }
  return (
    <ul aria-label="Top clients" className="border-t border-line">
      {clients.map((client) => (
        <li
          key={client.clientId}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-2.5 text-sm"
        >
          <span className="min-w-0 truncate">
            {clientHref ? (
              <Link
                to={clientHref(client.clientId)}
                className="font-semibold text-fg hover:underline"
              >
                {client.clientName}
              </Link>
            ) : (
              <span className="font-semibold text-fg">{client.clientName}</span>
            )}
            {client.organizationName ? (
              <span className="text-fg-muted"> · {client.organizationName}</span>
            ) : null}
          </span>
          <span className="font-mono text-xs text-fg-secondary">
            {formatCount(client.calls)} calls · {formatShare(client.errors, client.calls)} errors
          </span>
        </li>
      ))}
    </ul>
  );
}
