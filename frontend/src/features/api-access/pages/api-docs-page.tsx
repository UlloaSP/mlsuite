/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { useApiAccessBookmarks } from "@/features/api-access/api/api-access.queries";
import { EndpointDocsView } from "@/features/api-access/components/EndpointDocsView";
import { failureMessage } from "@/features/api-access/lib/api-format";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { AppSurface } from "@/shared/ui/AppSurface";
import { appButtonClass } from "@/shared/ui/button-styles";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import type { ApiAccessBookmarkDto } from "@/shared/api/openapi.gen";

type Given = ApiAccessBookmarkDto & { apiId: string };

const isGiven = (bookmark: ApiAccessBookmarkDto): bookmark is Given =>
  bookmark.apiId !== null && bookmark.clientNames.length > 0;

/**
 * The reference of the client API for each bookmark a client was given. The bookmark is chosen
 * in the URL (`?bookmark=<id>`), so a bookmark's menu can link straight to its endpoint.
 */
export function ApiDocsPage() {
  const bookmarks = useApiAccessBookmarks();
  const [selected, setSelected] = useSearchParamState<string>("bookmark", "");
  const given = (bookmarks.data ?? []).filter(isGiven);
  const requested = bookmarks.data?.find((bookmark) => String(bookmark.id) === selected);
  // Without a choice in the URL, the first bookmark clients can run is documented.
  const shown =
    given.find((bookmark) => String(bookmark.id) === selected) ??
    given.find((bookmark) => !bookmark.refusal) ??
    given[0];

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          breadcrumbs={[{ label: "API", to: "/api-access" }, { label: "Docs" }]}
          title="Docs"
          description="How a client calls each bookmark it was given: authentication, request, response, limits and errors."
        />
        {bookmarks.isLoading ? (
          <AppLoadingState compact label="Loading bookmarks…" />
        ) : bookmarks.error ? (
          <AppEmptyState
            compact
            title="Bookmarks did not load"
            description={failureMessage(bookmarks.error)}
            action={
              <AppButton variant="secondary" onClick={() => void bookmarks.refetch()}>
                Try again
              </AppButton>
            }
          />
        ) : (
          <>
            {requested && !isGiven(requested) ? (
              <p role="status" className="text-sm text-fg-secondary">
                No client may run {requested.name} yet. Give it to a client from the client's
                Bookmarks tab to document its endpoint.
              </p>
            ) : null}
            {given.length === 0 || !shown ? (
              <AppEmptyState
                compact
                title="No bookmark is open to clients"
                description="Give a bookmark to a client and its endpoint is documented here."
                action={
                  <Link
                    to="/api-access/clients"
                    className={appButtonClass({ variant: "secondary" })}
                  >
                    Open clients
                  </Link>
                }
              />
            ) : (
              <>
                <div className="max-w-md">
                  <AppCombobox
                    aria-label="Bookmark"
                    placeholder="Search bookmarks"
                    value={shown.id}
                    items={given.map((bookmark) => ({
                      id: bookmark.id,
                      label: `${bookmark.schemaName} › ${bookmark.name}`,
                    }))}
                    onChange={(item) => item && setSelected(String(item.id))}
                  />
                  <p className="mt-2 text-xs text-fg-muted">
                    Given to {shown.clientNames.join(", ")}.
                  </p>
                </div>
                <EndpointDocsView key={shown.id} bookmark={shown} />
              </>
            )}
          </>
        )}
      </AppSurface>
    </AppPage>
  );
}
