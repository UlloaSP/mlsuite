/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { AppBreadcrumbs, AppPage } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../user/hooks";
import { useWorkspaceContext } from "../../workspace/hooks";
import type { Bundle } from "../bundle-types";
import { DF_EXTS, getStem, isDfFile, isModelFile, slugToTitle } from "../bundle-utils";
import { BundleCard } from "../components/BundleCard";
import { BundleDropZone } from "../components/BundleDropZone";
import { BundleEmptyState } from "../components/BundleEmptyState";
import { BundleSummaryPanel } from "../components/BundleSummaryPanel";
import { useCreateModelMutation } from "../hooks";

let _nextId = 1;

export function CreateModelPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const mutation = useCreateModelMutation();
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();

  // ── Ingest dropped/selected files ───────────────────────────────────────

  const handleFiles = useCallback((files: File[]) => {
    const models = files.filter((f) => isModelFile(f.name));
    const dfs = files.filter((f) => isDfFile(f.name));
    const pool = [...dfs];

    setBundles((prev) => {
      const next = [...prev];

      models.forEach((modelFile) => {
        if (next.some((b) => b.modelFile.name === modelFile.name)) return;
        const stem = getStem(modelFile.name);
        const idx = pool.findIndex((df) => getStem(df.name).toLowerCase() === stem.toLowerCase());
        const dfFile = idx !== -1 ? pool.splice(idx, 1)[0] : null;
        next.push({
          id: _nextId++,
          modelFile,
          dfFile,
          name: slugToTitle(stem),
          saved: false,
          saving: false,
        });
      });

      // Attach remaining dfs to the first bundle that lacks one
      pool.forEach((df) => {
        const stem = getStem(df.name).toLowerCase();
        const target =
          next.find((b) => getStem(b.modelFile.name).toLowerCase() === stem && !b.dfFile) ??
          next.find((b) => !b.dfFile);
        if (target) {
          target.dfFile = df;
          target.saved = false;
        }
      });

      return next;
    });
  }, []);

  // ── Bundle actions ───────────────────────────────────────────────────────

  const removeBundle = (id: number) => setBundles((prev) => prev.filter((b) => b.id !== id));

  const setBundleName = (id: number, value: string) =>
    setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, name: value } : b)));

  const attachDf = (bundleId: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = DF_EXTS.join(",");
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (!files.length) return;
      setBundles((prev) =>
        prev.map((b) => (b.id === bundleId ? { ...b, dfFile: files[0], saved: false } : b)),
      );
    };
    input.click();
  };

  const saveBundle = async (id: number) => {
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle || !bundle.name.trim() || bundle.saved || bundle.saving) return;

    setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, saving: true } : b)));
    try {
      await mutation.mutateAsync({
        name: bundle.name.trim(),
        modelFile: bundle.modelFile,
        dataframeFile: bundle.dfFile ?? undefined,
      });
      setBundles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, saved: true, saving: false } : b)),
      );
    } catch {
      setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, saving: false } : b)));
    }
  };

  const saveAll = async () => {
    const unsaved = bundles.filter((b) => b.name.trim() && !b.saved && !b.saving);
    await Promise.all(unsaved.map((bundle) => saveBundle(bundle.id)));
    navigate("/models");
  };

  // ── Derived stats ────────────────────────────────────────────────────────

  const total = bundles.length;
  const withDf = bundles.filter((b) => b.dfFile).length;
  const saved = bundles.filter((b) => b.saved).length;
  const unsavedReady = bundles.filter((b) => b.name.trim() && !b.saved && !b.saving).length;
  const anySaving = bundles.some((b) => b.saving);

  if (!user || error) return <NotFoundError />;
  if (workspace && !workspace.permissions.canCreateModels) return <NotFoundError />;

  return (
    <AppPage>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-8 py-7">
        {/* ── Page header ─────────────────────────────────────────── */}
        <AppBreadcrumbs items={[{ label: "Models", to: "/models" }, { label: "Create Model" }]} />
        <header className="my-5 flex-shrink-0">
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
            Model Studio
          </p>
          <h1 className="text-[27px] font-semibold leading-[1.05] tracking-[-0.8px] text-[var(--text-primary)]">
            Create New Model
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">
            Drop model artifacts and dataframes. Files are grouped by name when possible.
          </p>
        </header>

        {/* ── Two-column layout ────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          {/* Left: drop zone + bundle list */}
          <section
            aria-label="Model bundles"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)]"
          >
            <BundleDropZone onFiles={handleFiles} />

            <div className="app-scroll mt-4 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto border-t border-[var(--border-soft)] px-4 pb-4 pt-3">
              {bundles.length === 0 ? (
                <BundleEmptyState />
              ) : (
                bundles.map((bundle, i) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    index={i}
                    onSave={() => saveBundle(bundle.id)}
                    onRemove={() => removeBundle(bundle.id)}
                    onRename={(v) => setBundleName(bundle.id, v)}
                    onAttachDf={() => attachDf(bundle.id)}
                  />
                ))
              )}
            </div>
          </section>

          {/* Right: summary panel */}
          <BundleSummaryPanel
            total={total}
            withDf={withDf}
            saved={saved}
            unsavedReady={unsavedReady}
            anySaving={anySaving}
            onSaveAll={saveAll}
            onClear={() => setBundles([])}
          />
        </div>
      </div>
    </AppPage>
  );
}
