/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BookmarkApiKeyRow } from "@/features/schemas/components/BookmarkApiKeyRow";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import type { BookmarkApiKeyDto } from "@/shared/api/openapi.gen";

type Props = {
  keys: BookmarkApiKeyDto[] | undefined;
  isLoading: boolean;
  /** Why the keys did not load, in the API's words. */
  error?: string;
  disabled: boolean;
  onRetry: () => void;
  onRevoke: (apiKey: BookmarkApiKeyDto) => void;
};

/** The keys of a bookmark, or why there are none to show. */
export function BookmarkApiKeyList({ keys, isLoading, error, disabled, onRetry, onRevoke }: Props) {
  if (isLoading) return <AppLoadingState compact label="Loading API keys…" />;
  if (error)
    return (
      <AppEmptyState
        compact
        title="API keys did not load"
        description={error}
        action={
          <AppButton variant="secondary" onClick={onRetry}>
            Try again
          </AppButton>
        }
      />
    );
  if (!keys?.length)
    return (
      <AppEmptyState
        compact
        title="No API keys yet"
        description="Create one for each program that should run this bookmark's model."
      />
    );
  return (
    <ul aria-label="API keys" className="border-t border-line">
      {keys.map((apiKey) => (
        <BookmarkApiKeyRow
          key={apiKey.id}
          apiKey={apiKey}
          disabled={disabled}
          onRevoke={onRevoke}
        />
      ))}
    </ul>
  );
}
