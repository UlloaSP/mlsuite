/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { FileJson2, GitCommitHorizontal, Globe, Lock, Tag } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { AppBadge } from "@/shared/ui/AppBadge";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";
import { UnpublishBookmarkDialog } from "./UnpublishBookmarkDialog";
import type { ModeratedBookmarkDto } from "@/shared/api/openapi.gen";

/**
 * A public bookmark of any organization. It opens its public page, except when its schema is
 * archived: that bookmark is still flagged public, but its page answers not found.
 */
export function ModeratedBookmarkTile({
  disabled,
  item,
  onUnpublish,
}: {
  disabled: boolean;
  item: ModeratedBookmarkDto;
  onUnpublish: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const publicPath = item.schemaArchived
    ? undefined
    : `/explore/${encodeURIComponent(item.publicId)}`;
  const close = () => {
    setError(undefined);
    setConfirming(false);
  };
  // A failed unpublish keeps the dialog open and shows the failure inside it.
  const unpublish = async () => {
    try {
      await onUnpublish();
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  return (
    <>
      <CatalogEntry
        title={item.name}
        titleAccessory={
          item.schemaArchived ? <AppBadge tone="warning">Schema archived</AppBadge> : null
        }
        icon={<Tag size={16} className="mt-1 text-fg-secondary" />}
        metadata={
          <>
            <span className="inline-flex items-center gap-1">
              <OrganizationMark
                className="size-4 rounded-sm"
                iconSize={14}
                logoUrl={item.organizationLogoUrl}
              />
              {item.organizationName}
            </span>
            <span className="inline-flex items-center gap-1">
              <FileJson2 size={14} />
              {item.schemaName}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitCommitHorizontal size={14} />
              {snapshotLabel(item.versionName, item.version)}
            </span>
            <span>
              Updated <LiveRelativeTime value={item.updatedAt} /> ago
            </span>
            {item.schemaArchived ? <span>Public page not available</span> : null}
          </>
        }
        actions={
          <>
            {publicPath ? (
              <Link
                to={publicPath}
                className={appButtonClass({ size: "sm", variant: "secondary" })}
              >
                <Globe size={14} />
                Public page
              </Link>
            ) : null}
            <AppActionsMenu
              label={`Open actions for ${item.name}`}
              disabled={disabled}
              actions={[
                {
                  key: "unpublish",
                  label: "Unpublish",
                  icon: Lock,
                  tone: "danger",
                  onSelect: () => setConfirming(true),
                },
              ]}
            />
          </>
        }
        to={publicPath}
      />
      {confirming ? (
        <UnpublishBookmarkDialog
          bookmark={item}
          disabled={disabled}
          error={error}
          onCancel={close}
          onConfirm={() => void unpublish()}
        />
      ) : null}
    </>
  );
}
