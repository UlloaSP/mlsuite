/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy, Link2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppButton, AppIconButton, AppTextField } from "../../app/components";
import { formatTimestamp } from "../../algorithms/models/utils";
import {
  useCreateSchemaReviewLinkMutation,
  useRevokeSchemaReviewLinkMutation,
  useSchemaReviewLinks,
} from "../../schema-review/hooks";
import type { PredictionRunDto, SchemaVersionDto } from "../types";

type Props = {
  runs: PredictionRunDto[];
  version: SchemaVersionDto;
  onClose: () => void;
};

const reviewUrl = (token: string): string => `${window.location.origin}/schema-review/${token}`;

const defaultExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

export function SchemaRunReviewLinkDialog({ runs, version, onClose }: Props) {
  const [expiresAt, setExpiresAt] = useState(defaultExpiryDate);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(
    () => new Set(runs.map((run) => run.id)),
  );
  const links = useSchemaReviewLinks(version.schemaId, version.id);
  const createLink = useCreateSchemaReviewLinkMutation(version.schemaId, version.id);
  const revokeLink = useRevokeSchemaReviewLinkMutation(version.schemaId, version.id);
  const activeLinks = useMemo(
    () =>
      (links.data ?? []).filter((link) => !link.revokedAt && new Date(link.expiresAt) > new Date()),
    [links.data],
  );
  const selectedRuns = useMemo(
    () => runs.filter((run) => selectedRunIds.has(run.id)),
    [runs, selectedRunIds],
  );

  useEffect(() => {
    // react-doctor-disable-next-line react-doctor/no-cascading-set-state, react-doctor/no-derived-state, react-doctor/no-adjust-state-on-prop-change, react-doctor/no-pass-data-to-parent -- Modal selection resets when opening/changing visible inference set, matching schema share modal behavior.
    setSelectedRunIds(new Set(runs.map((run) => run.id)));
  }, [runs]);

  const create = async () => {
    try {
      if (selectedRuns.length === 0) {
        toast.error("Select at least one inference");
        return;
      }
      const expiry = new Date(`${expiresAt}T23:59:59.000Z`).toISOString();
      await createLink.mutateAsync({
        schemaId: version.schemaId,
        versionId: version.id,
        runIds: selectedRuns.map((run) => run.id),
        expiresAt: expiry,
      });
      toast.success("Review link created");
    } catch (error) {
      toast.error("Review link failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Review link copied");
  };

  const toggleSelection = useCallback((runId: string) => {
    setSelectedRunIds((current) => {
      const next = new Set(current);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-hover)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold">Share review link</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {selectedRuns.length} of {runs.length} inference{runs.length === 1 ? "" : "s"}{" "}
              selected.
            </p>
          </div>
          <AppIconButton type="button" aria-label="Close" onClick={onClose} className="rounded-md">
            <X size={18} />
          </AppIconButton>
        </header>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-h-0 border-r border-[var(--border-soft)] px-6 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Inferences
              </p>
              <div className="flex gap-2">
                <AppButton
                  type="button"
                  variant="secondary"
                  className="rounded-md px-3 py-2"
                  onClick={() => setSelectedRunIds(new Set(runs.map((run) => run.id)))}
                >
                  Select all
                </AppButton>
                <AppButton
                  type="button"
                  variant="ghost"
                  className="rounded-md px-3 py-2"
                  onClick={() => setSelectedRunIds(new Set())}
                >
                  Deselect all
                </AppButton>
              </div>
            </div>
            <div className="max-h-[58vh] overflow-auto border-y border-[var(--border-soft)]">
              {runs.map((run) => {
                const selected = selectedRunIds.has(run.id);
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => toggleSelection(run.id)}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_160px] items-center gap-4 border-b border-[var(--border-soft)] px-3 py-3 text-left transition last:border-b-0 ${selected ? "bg-[var(--accent-quiet)]" : "hover:bg-[var(--surface-muted)]"}`}
                  >
                    <span
                      className={`grid size-6 place-items-center rounded-md border text-sm font-semibold ${selected ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white" : "border-[var(--border-strong)] text-transparent"}`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 truncate text-sm font-semibold">{run.name}</span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {formatTimestamp(run.createdAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <aside className="min-h-0 space-y-5 overflow-auto px-6 py-5">
            <div className="flex gap-3">
              <AppTextField
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.currentTarget.value)}
                className="min-w-0 flex-1 rounded-md"
              />
              <AppButton
                type="button"
                disabled={selectedRuns.length === 0 || createLink.isPending}
                onClick={() => void create()}
                className="rounded-md px-4"
              >
                <Link2 size={16} />
                Generate
              </AppButton>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Links
              </p>
              <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                {activeLinks.map((link) => {
                  const url = link.token ? reviewUrl(link.token) : "";
                  return (
                    <div key={link.id} className="space-y-2 py-4">
                      <p className="text-sm font-semibold">{link.runCount} inferences</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Created {formatTimestamp(link.createdAt)} · Expires{" "}
                        {formatTimestamp(link.expiresAt)}
                      </p>
                      <div className="flex gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          disabled={!url}
                          onClick={() => void copy(url)}
                          className="rounded-md px-3 py-2"
                        >
                          <Copy size={15} />
                          Copy
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          disabled={Boolean(link.revokedAt) || revokeLink.isPending}
                          onClick={() => revokeLink.mutate(link.id)}
                          className="rounded-md px-3 py-2"
                        >
                          {link.revokedAt ? "Revoked" : "Revoke"}
                        </AppButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
