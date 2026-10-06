/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { Building2, FileJson2, GitCommitHorizontal } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import {
  isPublicBookmarkMissing,
  publicBookmarkExamplesQueryOptions,
  publicBookmarkQueryOptions,
} from "@/features/explore/api/public-bookmark-api";
import { PublicBookmarkExampleSelect } from "@/features/explore/components/PublicBookmarkExampleSelect";
import { PublicBookmarkForm } from "@/features/explore/components/PublicBookmarkForm";
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
import type { PublicBookmarkExampleDto } from "@/shared/api/openapi.gen";

const FACT = "inline-flex items-center gap-1.5";

/**
 * A published bookmark, the same for anonymous visitors and members of any organization.
 * It reads only the public API; the frame around it is chosen by the router.
 */
export function PublicBookmarkPage() {
  const { publicId = "" } = useParams<{ publicId: string }>();
  const query = useQuery(publicBookmarkQueryOptions(publicId));
  const bookmark = query.data;
  const examples = useQuery(publicBookmarkExamplesQueryOptions(publicId)).data;
  // The example the form was loaded from, held with the form it belongs to: a later refetch of
  // the list never resets what the visitor is editing, and another bookmark or snapshot starts blank.
  const [loaded, setLoaded] = useState<{ formKey: string; example: PublicBookmarkExampleDto }>();
  const formKey = bookmark ? `${bookmark.publicId}:${bookmark.version}` : "";
  const example = loaded?.formKey === formKey ? loaded.example : undefined;

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
        {examples && examples.length > 0 ? (
          <section aria-label="Examples" className={FORM_MAX_WIDTH}>
            <PublicBookmarkExampleSelect
              examples={examples}
              value={example?.id}
              onChange={(id) => {
                const chosen = examples.find((item) => item.id === id);
                if (chosen) setLoaded({ formKey, example: chosen });
              }}
            />
          </section>
        ) : null}
        <section aria-label="Form inputs" className={FORM_MAX_WIDTH}>
          {/* A republished or moved bookmark is a new form, not an update of the mounted one;
              so is loading an example, whose inputs become the new form's starting values. */}
          <PublicBookmarkForm
            key={`${formKey}:${example?.id ?? "blank"}`}
            formSchema={bookmark.formSchema}
            initialInputs={example?.inputs}
          />
        </section>
      </AppSurface>
    </AppPage>
  );
}
