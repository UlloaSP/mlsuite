/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, PencilLine } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AppBadge,
  AppButton,
  AppCopy,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSectionTitle,
  AppSurface,
} from "../../app/components";
import {
  useSchema,
  useSchemaDraft,
  useSchemaDraftDiff,
  useSchemaVersion,
} from "../../api/schemas/hooks";
import { SchemaMergeDiffViewer } from "../components/SchemaMergeDiffViewer";

const PAGE_SIZE = 6;

const displayValue = (value: unknown) =>
  value === undefined ? "missing" : typeof value === "string" ? value : JSON.stringify(value);

export function SchemaDraftConflictPage() {
  const { schemaId, draftId } = useParams<{ schemaId: string; draftId: string }>();
  const { data: schemaDto } = useSchema(schemaId);
  const { data: draft } = useSchemaDraft(draftId);
  const { data: diff } = useSchemaDraftDiff(draftId);
  const { data: currentVersion } = useSchemaVersion(diff?.currentVersionId);
  const [page, setPage] = useState(1);

  const conflicts = useMemo(
    () => (diff?.changes ?? []).filter((change) => change.conflict),
    [diff?.changes],
  );
  const totalPages = Math.max(1, Math.ceil(conflicts.length / PAGE_SIZE));
  const pageItems = conflicts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-5 overflow-auto">
        <AppPageHeader
          title="Schema merge review"
          description={draft ? `${draft.name} · base v${draft.baseVersion}` : undefined}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId
              ? [{ label: schemaDto?.name ?? "Schema", to: `/schemas/${schemaId}` }]
              : []),
            { label: "Merge review" },
          ]}
          actions={
            schemaId && draftId ? (
              <Link to={`/schemas/${schemaId}/drafts/${draftId}`}>
                <AppButton variant="secondary">
                  <PencilLine size={16} />
                  Manual edit
                </AppButton>
              </Link>
            ) : null
          }
        />
        <AppPanel className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <AppSectionTitle>Current vs incoming</AppSectionTitle>
              <AppCopy>
                Review the incoming draft against the current published version before resolving.
              </AppCopy>
            </div>
            <div className="flex flex-wrap gap-2">
              <AppBadge tone="neutral">current v{currentVersion?.version ?? "-"}</AppBadge>
              <AppBadge tone={diff?.hasConflicts ? "danger" : "success"}>
                {diff?.hasConflicts ? "conflicts" : "clean"}
              </AppBadge>
            </div>
          </div>
          {currentVersion && draft ? (
            <SchemaMergeDiffViewer
              currentSchema={currentVersion.formSchema}
              incomingSchema={draft.formSchema}
            />
          ) : (
            <AppCopy>Loading merge diff.</AppCopy>
          )}
        </AppPanel>
        <AppPanel className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Same-path conflicts</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                These schema paths changed in both current and incoming versions.
              </p>
            </div>
            <AppBadge tone="danger">{conflicts.length} conflicts</AppBadge>
          </div>
          <div className="space-y-3">
            {pageItems.map((change) => (
              <div key={change.path} className="rounded border border-[var(--border-soft)] p-4">
                <div className="font-mono text-sm text-[var(--text-primary)]">{change.path}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      Base
                    </div>
                    <div className="mt-1 break-words text-sm">{displayValue(change.baseValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--danger-text)]">
                      Draft
                    </div>
                    <div className="mt-1 break-words text-sm">
                      {displayValue(change.draftValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      Current
                    </div>
                    <div className="mt-1 break-words text-sm">
                      {displayValue(change.currentValue)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!conflicts.length ? (
              <p className="text-sm text-[var(--text-secondary)]">No same-path conflicts.</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-4 text-sm text-[var(--text-secondary)]">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <AppButton
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ArrowLeft size={16} />
                Previous
              </AppButton>
              <AppButton
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </AppButton>
            </div>
          </div>
        </AppPanel>
      </AppSurface>
    </AppPage>
  );
}
