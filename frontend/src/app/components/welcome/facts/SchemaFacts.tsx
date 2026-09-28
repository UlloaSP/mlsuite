/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  useSchemaBookmarks,
  useSchemaDraft,
  useSchemaDrafts,
  useSchemaVersion,
  useSchemaVersions,
} from "@/features/schemas/api/schema-queries";
import { formatTimestamp } from "@/shared/lib/date-time";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { AppBadge } from "@/shared/ui/AppBadge";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { FactList, type Fact } from "@/app/components/welcome/FactList";

type Props = { schemaId: string; draftId?: string; versionId?: string };

const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);

/**
 * A schema's repository state (snapshots, bookmarks, open changes), led by the
 * draft or snapshot the member had open, when they had one.
 */
export function SchemaFacts({ schemaId, draftId, versionId }: Props) {
  const versions = useSchemaVersions(schemaId).data;
  const bookmarks = useSchemaBookmarks(schemaId).data;
  const drafts = useSchemaDrafts(schemaId).data;
  const draft = useSchemaDraft(draftId).data;
  const version = useSchemaVersion(versionId).data;
  if (!versions || !bookmarks || !drafts) return null;

  const latest = [...versions].sort((left, right) => right.version - left.version)[0];
  const open = drafts.filter((item) => item.status !== "PUBLISHED");
  const conflicts = open.filter((item) => item.status === "CONFLICT").length;
  const focus: Fact[] = draft
    ? [
        {
          label: "Change",
          value: (
            <>
              {draft.name}{" "}
              <AppBadge tone={draft.status === "CONFLICT" ? "danger" : "accent"}>
                {draft.status}
              </AppBadge>
            </>
          ),
        },
        { label: "Based on", value: `v${draft.baseVersion} · revision ${draft.revision}` },
        {
          label: "Edited",
          value: (
            <>
              <LiveRelativeTime value={draft.updatedAt} /> ago
            </>
          ),
        },
      ]
    : version
      ? [
          { label: "Snapshot", value: snapshotLabel(version.name, version.version) },
          {
            label: "Models",
            value: version.bindings.map((binding) => binding.modelName).join(", "),
          },
          {
            label: "Inputs",
            value: count((version.formSchema as { fields?: unknown }).fields),
          },
          { label: "Published", value: formatTimestamp(version.createdAt) },
        ]
      : [];

  return (
    <FactList
      facts={[
        ...focus,
        {
          label: "Latest snapshot",
          value: latest ? (
            <>
              {snapshotLabel(latest.name, latest.version)} ·{" "}
              <LiveRelativeTime value={latest.createdAt} /> ago
            </>
          ) : (
            "Not published yet"
          ),
        },
        { label: "Bookmarks", value: bookmarks.length },
        {
          label: "Open changes",
          value:
            conflicts > 0 ? (
              <>
                {open.length} <AppBadge tone="danger">{conflicts} in conflict</AppBadge>
              </>
            ) : (
              open.length
            ),
        },
      ]}
    />
  );
}
