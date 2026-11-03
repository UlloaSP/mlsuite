import { Trash2, Users } from "lucide-react";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { formatDate } from "@/shared/lib/date-time";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { AppBadge } from "@/shared/ui/AppBadge";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { ManagedReviewDto } from "@/shared/api/openapi.gen";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** A review of the organization; one whose inferences were all deleted says so. */
export function ManagedReviewEntry({
  disabled,
  item,
  onDelete,
}: {
  disabled: boolean;
  item: ManagedReviewDto;
  onDelete: () => void;
}) {
  const Icon = SECTION_ICONS.reviews;
  const expired = new Date(item.expiresAt) <= new Date();
  return (
    <CatalogEntry
      title={item.schemaName}
      titleAccessory={
        item.runs === 0 ? (
          <AppBadge tone="warning">No inferences left</AppBadge>
        ) : expired ? (
          <AppBadge tone="neutral">Expired</AppBadge>
        ) : (
          <AppBadge tone="info">Open</AppBadge>
        )
      }
      icon={<Icon size={16} className="mt-1 text-fg-secondary" />}
      metadata={
        <>
          <span>{snapshotLabel(item.schemaVersionName, item.schemaVersion)}</span>
          <span>{plural(item.runs, "inference", "inferences")}</span>
          <span className="inline-flex items-center gap-1">
            <Users size={14} />
            {plural(item.reviewers, "reviewer", "reviewers")}
          </span>
          <span>Created by {item.createdByName}</span>
          <span>
            {expired ? "Expired" : "Expires"} {formatDate(item.expiresAt)}
          </span>
        </>
      }
      actions={
        <AppActionsMenu
          label={`Open actions for the review of ${item.schemaName}`}
          disabled={disabled}
          actions={[
            {
              key: "delete",
              label: "Delete",
              icon: Trash2,
              tone: "danger",
              onSelect: onDelete,
            },
          ]}
        />
      }
    />
  );
}
