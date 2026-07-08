/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { FileJson, ListTree, Network } from "lucide-react";
import { Link } from "react-router";
import type { SchemaVersionDto } from "../../api/schemas/dtos";
import {
  countSchemaReports,
  formatSchemaDate,
  shortSchemaId,
} from "../../algorithms/schema/schema-metadata";
import { countVisibleSchemaFields } from "../../algorithms/schema/one-hot-category";
import { schemaVersionId } from "../../algorithms/schema/version-selection";
import { AppBadge, AppButton, AppPanel, AppSectionTitle } from "../../app/components";

type Props = {
  schemaId: string;
  version?: SchemaVersionDto;
  onBookmark: (version: SchemaVersionDto) => void;
};

export function LatestSnapshotOverview({ schemaId, version, onBookmark }: Props) {
  if (!version) {
    return (
      <AppPanel className="flex flex-col gap-3">
        <AppSectionTitle>No published snapshots</AppSectionTitle>
        <p className="text-sm text-[var(--text-secondary)]">
          Create a change and publish it to establish the schema document.
        </p>
      </AppPanel>
    );
  }

  const metrics = [
    { label: "Fields", value: countVisibleSchemaFields(version.formSchema), icon: ListTree },
    { label: "Reports", value: countSchemaReports(version.formSchema), icon: FileJson },
    { label: "Bindings", value: version.bindings.length, icon: Network },
  ];

  return (
    <AppPanel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <AppSectionTitle>Latest snapshot</AppSectionTitle>
            <AppBadge tone="success">v{version.version}</AppBadge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {version.name} · {shortSchemaId(version.id)} · {formatSchemaDate(version.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/schemas/${schemaId}/versions/${schemaVersionId(version)}`}>
            <AppButton variant="secondary">Open snapshot</AppButton>
          </Link>
          <AppButton onClick={() => onBookmark(version)}>Bookmark</AppButton>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className="rounded border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-4"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <Icon size={14} />
                {row.label}
              </div>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{row.value}</p>
            </div>
          );
        })}
      </div>
    </AppPanel>
  );
}
