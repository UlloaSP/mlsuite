/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { Building2, FileJson2, GitCommitHorizontal } from "lucide-react";
import { useParams } from "react-router";
import {
  isPublicBookmarkMissing,
  publicBookmarkExamplesQueryOptions,
  publicBookmarkQueryOptions,
} from "@/features/explore/api/public-bookmark-api";
import { PublicBookmarkForm } from "@/features/explore/components/PublicBookmarkForm";
import { WorkspaceBookmarkLink } from "@/features/explore/components/WorkspaceBookmarkLink";
import { formatDate } from "@/shared/lib/date-time";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { cx } from "@/shared/ui/cx";
import { FORM_MAX_WIDTH } from "@/shared/ui/page-layout";
import { AppPageHeader } from "@/shared/ui/PageHeader";

const FACT = "inline-flex items-center gap-1.5";

/**
 * A published bookmark, the same for anonymous visitors and members of any organization:
 * its form is read and run through the public API, and the frame around it is chosen by the
 * router. Members of the organization that owns it also get the way into their workspace.
 */
export function PublicBookmarkPage() {
  const { publicId = "" } = useParams<{ publicId: string }>();
  const query = useQuery(publicBookmarkQueryOptions(publicId));
  const bookmark = query.data;
  const examples = useQuery(publicBookmarkExamplesQueryOptions(publicId)).data;

  if (query.isPending) return <AppPageLoader label="Loading public bookmark…" />;

  if (!bookmark) {
    const missing = isPublicBookmarkMissing(query.error);
    return (
      <AppPage>
        <AppSurface className="flex flex-1 flex-col overflow-auto">
          <AppEmptyState
            className={cx(FORM_MAX_WIDTH, "my-auto")}
            title={missing ? "Bookmark not found" : "This bookmark could not be loaded"}
            description={
              missing
                ? "This link does not lead to a public bookmark. It may have been unpublished, or the address may be wrong."
                : "The request failed before the bookmark arrived. Check your connection and try again."
            }
            action={
              missing ? undefined : (
                <AppButton disabled={query.isFetching} onClick={() => void query.refetch()}>
                  Try again
                </AppButton>
              )
            }
          />
        </AppSurface>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          className={FORM_MAX_WIDTH}
          breadcrumbScope="public"
          breadcrumbs={[{ label: bookmark.name }]}
          title={bookmark.name}
          description={bookmark.schemaDescription ?? undefined}
          actions={<WorkspaceBookmarkLink publicId={bookmark.publicId} />}
        />
        <dl
          className={cx(
            FORM_MAX_WIDTH,
            "flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-secondary",
          )}
        >
          <div className={FACT}>
            <dt className="sr-only">Published by</dt>
            <Building2 size={14} aria-hidden="true" />
            <dd>{bookmark.organizationName}</dd>
          </div>
          <div className={FACT}>
            <dt className="sr-only">Schema</dt>
            <FileJson2 size={14} aria-hidden="true" />
            <dd>{bookmark.schemaName}</dd>
          </div>
          <div className={FACT}>
            <dt className="sr-only">Snapshot</dt>
            <GitCommitHorizontal size={14} aria-hidden="true" />
            <dd>{snapshotLabel(bookmark.versionName, bookmark.version)}</dd>
          </div>
          <div className={FACT}>
            <dt>Updated</dt>
            <dd>{formatDate(bookmark.updatedAt)}</dd>
          </div>
        </dl>
        <section aria-label="Form" className={FORM_MAX_WIDTH}>
          {/* A republished or moved bookmark is a new form, not an update of the mounted one. */}
          <PublicBookmarkForm
            key={`${bookmark.publicId}:${bookmark.version}`}
            publicId={bookmark.publicId}
            version={bookmark.version}
            formSchema={bookmark.formSchema}
            examples={examples}
          />
        </section>
      </AppSurface>
    </AppPage>
  );
}
