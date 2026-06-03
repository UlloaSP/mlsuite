/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppButton, AppIconButton } from "../../app/components/ui-controls";
import { formatTimestamp } from "../../models/utils";
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

export function SchemaRunReviewLinkDialog({ runs, version, onClose }: Props) {
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(
    () => new Set(runs.map((run) => run.id)),
  );
  const links = useSchemaReviewLinks(version.schemaId, version.id);
  const createLink = useCreateSchemaReviewLinkMutation(version.schemaId, version.id);
  const revokeLink = useRevokeSchemaReviewLinkMutation(version.schemaId, version.id);
  const selectedRuns = useMemo(
    () => runs.filter((run) => selectedRunIds.has(run.id)),
    [runs, selectedRunIds],
  );

  useEffect(() => {
    setSelectedRunIds(new Set(runs.map((run) => run.id)));
  }, [runs]);

  const create = async () => {
    try {
      if (selectedRuns.length === 0) {
        toast.error("Select at least one inference");
        return;
      }
      const result = await createLink.mutateAsync({
        schemaId: version.schemaId,
        versionId: version.id,
        runIds: selectedRuns.map((run) => run.id),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      await navigator.clipboard.writeText(result.url);
      toast.success("Review link copied");
    } catch (error) {
      toast.error("Review link failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-hover)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold">Share review link</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {selectedRuns.length} of {runs.length} inference{runs.length === 1 ? "" : "s"} selected.
            </p>
          </div>
          <AppIconButton type="button" aria-label="Close" onClick={onClose} className="rounded-md">
            <X size={18} />
          </AppIconButton>
        </header>
        <main className="min-h-0 flex-1 space-y-5 overflow-auto px-6 py-5">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold">Expires at</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-2"
            />
          </label>
          <section className="space-y-3 rounded-lg border border-[var(--border-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Inferences</p>
              <div className="flex gap-2">
                <AppButton
                  type="button"
                  variant="ghost"
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
            <div className="max-h-56 overflow-auto rounded-md border border-[var(--border-soft)]">
              {runs.map((run) => (
                <label
                  key={run.id}
                  className="flex items-center gap-3 border-b border-[var(--border-soft)] px-3 py-2 text-sm last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedRunIds.has(run.id)}
                    onChange={() =>
                      setSelectedRunIds((current) => {
                        const next = new Set(current);
                        if (next.has(run.id)) next.delete(run.id);
                        else next.add(run.id);
                        return next;
                      })
                    }
                    className="size-4 rounded border-[var(--border-soft)] accent-[var(--accent-primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate">{run.name}</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {formatTimestamp(run.createdAt)}
                  </span>
                </label>
              ))}
            </div>
          </section>
          <AppButton
            type="button"
            disabled={createLink.isPending || selectedRuns.length === 0}
            onClick={() => void create()}
          >
            <Copy size={16} />
            Create and copy
          </AppButton>
          <div className="border-y border-[var(--border-soft)]">
            {(links.data ?? []).map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] px-1 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{link.createdByEmail}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatTimestamp(link.createdAt)} · {link.runCount} runs
                    {link.revokedAt ? " · revoked" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {link.token ? (
                    <AppButton type="button" variant="secondary" className="rounded-md px-3 py-2" onClick={() => void navigator.clipboard.writeText(reviewUrl(link.token!))}>
                      Copy
                    </AppButton>
                  ) : null}
                  {!link.revokedAt ? (
                    <AppButton type="button" variant="ghost" className="rounded-md px-3 py-2" onClick={() => revokeLink.mutate(link.id)}>
                      Revoke
                    </AppButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
