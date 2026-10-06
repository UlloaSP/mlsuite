/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  ExternalLink,
  GitCommitHorizontal,
  Globe,
  Link2,
  ListChecks,
  Lock,
  Play,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { AppActionsMenu, type AppMenuAction } from "@/shared/ui/AppActionsMenu";
import { AppBadge } from "@/shared/ui/AppBadge";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { useSetBookmarkVisibilityMutation } from "@/features/schemas/api/schema-mutations";
import { BookmarkExamplesDialog } from "@/features/schemas/components/BookmarkExamplesDialog";
import { bookmarkExampleSummary } from "@/features/schemas/lib/bookmark-example-status";
import { publicBookmarkHref } from "@/features/schemas/lib/public-bookmark-href";
import type { SchemaBookmarkDto } from "@/shared/api/openapi.gen";

/**
 * A bookmark in its schema's repository; opening it goes to its Predict workspace.
 * Everyone sees whether it is public and which examples it serves; only members who may
 * publish can change either.
 */
export function SchemaBookmarkCatalogItem({ bookmark }: { bookmark: SchemaBookmarkDto }) {
  const workspacePath = `/predict/${bookmark.id}`;
  const canPublish = useCan("canPublishBookmarks");
  const visibility = useSetBookmarkVisibilityMutation();
  const { confirm, dialog } = useActionDialog();
  const [examplesOpen, setExamplesOpen] = useState(false);
  const examples = bookmarkExampleSummary(bookmark);
  const publicPath =
    bookmark.visibility === "PUBLIC" && bookmark.publicId
      ? publicBookmarkHref(bookmark.publicId)
      : null;

  const publish = async () => {
    const confirmed = await confirm({
      title: `Publish ${bookmark.name}?`,
      description:
        "Anyone with the link will see this bookmark's name, its schema and organization names, and the form of the snapshot it points to. Models, runs and members stay private.",
      confirmLabel: "Publish",
    });
    if (confirmed) visibility.mutate({ bookmarkId: bookmark.id, visibility: "PUBLIC" });
  };

  const copyLink = async () => {
    if (!publicPath) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
      toast.success("Public link copied");
    } catch {
      toast.error("Could not copy the link", {
        description: "Open the public page and copy its address.",
      });
    }
  };

  // Offered when there are examples to review, or to the members who choose them.
  const hasExamples = bookmark.exampleCount + bookmark.staleExampleCount > 0;

  const actions: AppMenuAction[] = [
    ...(publicPath
      ? [
          { key: "copy", label: "Copy public link", icon: Link2, onSelect: () => void copyLink() },
          {
            key: "open",
            label: "Open public page",
            icon: ExternalLink,
            onSelect: () => window.open(publicPath, "_blank", "noopener"),
          },
        ]
      : []),
    ...(canPublish || hasExamples
      ? [
          {
            key: "examples",
            label: "Public examples",
            icon: ListChecks,
            onSelect: () => setExamplesOpen(true),
          },
        ]
      : []),
    ...(canPublish
      ? [
          publicPath
            ? {
                key: "unpublish",
                label: "Unpublish",
                icon: Lock,
                disabled: visibility.isPending,
                onSelect: () =>
                  visibility.mutate({ bookmarkId: bookmark.id, visibility: "PRIVATE" }),
              }
            : {
                key: "publish",
                label: "Publish",
                icon: Globe,
                disabled: visibility.isPending,
                onSelect: () => void publish(),
              },
        ]
      : []),
  ];

  return (
    <>
      <CatalogEntry
        title={bookmark.name}
        titleAccessory={
          <AppBadge tone={publicPath ? "info" : "neutral"}>
            {publicPath ? "Public" : "Private"}
          </AppBadge>
        }
        icon={<Tag size={16} className="mt-1 text-fg-secondary" />}
        metadata={
          <>
            <span className="inline-flex items-center gap-1">
              <GitCommitHorizontal size={14} />
              {snapshotLabel(bookmark.versionName, bookmark.version)}
            </span>
            {examples.served ? (
              <span className="inline-flex items-center gap-1">
                <ListChecks size={14} />
                {examples.served}
              </span>
            ) : null}
            {examples.stale ? <span className="text-warning-fg">{examples.stale}</span> : null}
            <span>
              Updated <LiveRelativeTime value={bookmark.updatedAt} /> ago
            </span>
          </>
        }
        actions={
          <>
            <Link to={workspacePath} className={appButtonClass({ size: "sm" })}>
              <Play size={14} />
              Predict
            </Link>
            <AppActionsMenu actions={actions} label={`Open actions for ${bookmark.name}`} />
          </>
        }
        to={workspacePath}
      />
      {dialog}
      <BookmarkExamplesDialog
        bookmark={bookmark}
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
      />
    </>
  );
}
