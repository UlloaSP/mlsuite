/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppButton } from "@/shared/ui/AppButton";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import type { BookmarkApiKeyDto } from "@/shared/api/openapi.gen";

type Props = {
  apiKey: BookmarkApiKeyDto;
  disabled: boolean;
  onRevoke: (apiKey: BookmarkApiKeyDto) => void;
};

/** One key of a bookmark: its consumer, the start of its secret, and when it was last used. */
export function BookmarkApiKeyRow({ apiKey, disabled, onRevoke }: Props) {
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-line py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{apiKey.name}</p>
        <p className="font-mono text-xs text-fg-secondary">{apiKey.prefix}…</p>
        <p className="mt-1 text-xs text-fg-muted">
          Created <LiveRelativeTime value={apiKey.createdAt} /> ago
          {apiKey.createdByName ? ` by ${apiKey.createdByName}` : ""}
          {" · "}
          {apiKey.lastUsedAt ? (
            <>
              Used <LiveRelativeTime value={apiKey.lastUsedAt} /> ago
            </>
          ) : (
            "Never used"
          )}
        </p>
      </div>
      <AppButton
        size="sm"
        variant="secondary"
        disabled={disabled}
        aria-label={`Revoke ${apiKey.name}`}
        onClick={() => onRevoke(apiKey)}
      >
        Revoke
      </AppButton>
    </li>
  );
}
