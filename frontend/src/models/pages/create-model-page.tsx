/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { AppBreadcrumbs, AppPage } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { emitErrorFromUnknown } from "../../app/utils/error-sink";
import { useUser } from "../../user/hooks";
import { useWorkspaceContext } from "../../workspace/hooks";
import { applyInspectedBundleFiles, type InspectedBundleFile } from "../bundle-planner";
import type { Bundle } from "../bundle-types";
import { DF_EXTS, getStem, isDfFile, isJoblibFile, isModelFile, slugToTitle } from "../bundle-utils";
import { BundleCard } from "../components/BundleCard";
import { BundleDropZone } from "../components/BundleDropZone";
import { BundleEmptyState } from "../components/BundleEmptyState";
import { BundleSummaryPanel } from "../components/BundleSummaryPanel";
import { useCreateModelMutation, useInspectArtifactMutation } from "../hooks";

let _nextId = 1;

export function CreateModelPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const mutation = useCreateModelMutation();
  const { mutateAsync: inspectArtifact } = useInspectArtifactMutation();
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();

  // ── Ingest dropped/selected files ───────────────────────────────────────

  const handleFiles = useCallback(async (files: File[]) => {
    const inspected = await Promise.all(
      files.map(async (file) => {
        if (isJoblibFile(file.name)) {
          try {
            const inspection = await inspectArtifact(file);
            return { file, kind: inspection.kind };
          } catch (error) {
            emitErrorFromUnknown(error);
          }
          return null;
        }
        if (isDfFile(file.name)) return { file, kind: "dataframe" as const };
        if (isModelFile(file.name)) return { file, kind: "model" as const };
        return null;
      }),
    );

    const accepted = inspected.filter((item): item is InspectedBundleFile => item !== null);

    setBundles((prev) => {
      const result = applyInspectedBundleFiles(prev, accepted, _nextId);
      _nextId = result.nextId;
      return result.bundles;
    });
  }, [inspectArtifact]);

  // ── Bundle actions ───────────────────────────────────────────────────────

  const removeBundle = (id: number) => setBundles((prev) => prev.filter((b) => b.id !== id));

  const setBundleName = (id: number, value: string) =>
    setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, name: value } : b)));

  const attachModel = (bundleId: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".joblib";
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (!files.length) return;
      const file = files[0];
      try {
        const inspection = await inspectArtifact(file);
        if (inspection.kind !== "model") return;
      } catch (error) {
        emitErrorFromUnknown(error);
        return;
      }
      setBundles((prev) =>
        prev.map((b) =>
          b.id === bundleId
            ? {
                ...b,
                modelFile: file,
                name: b.name.trim() ? b.name : slugToTitle(getStem(file.name)),
                saved: false,
              }
            : b,
        ),
      );
    };
    input.click();
  };

  const attachDf = (bundleId: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = DF_EXTS.join(",");
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (!files.length) return;
      const file = files[0];
      if (isJoblibFile(file.name)) {
        try {
          const inspection = await inspectArtifact(file);
          if (inspection.kind !== "dataframe") return;
        } catch (error) {
          emitErrorFromUnknown(error);
          return;
        }
      }
      setBundles((prev) =>
        prev.map((b) => (b.id === bundleId ? { ...b, dfFile: file, saved: false } : b)),
      );
    };
    input.click();
  };

  const saveBundle = async (id: number) => {
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle?.modelFile || !bundle.name.trim() || bundle.saved || bundle.saving) return;

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
    const unsaved = bundles.filter((b) => b.modelFile && b.name.trim() && !b.saved && !b.saving);
    await Promise.all(unsaved.map((bundle) => saveBundle(bundle.id)));
    navigate("/models");
  };

  // ── Derived stats ────────────────────────────────────────────────────────

  const total = bundles.length;
  const withDf = bundles.filter((b) => b.dfFile).length;
  const saved = bundles.filter((b) => b.saved).length;
  const unsavedReady = bundles.filter((b) => b.modelFile && b.name.trim() && !b.saved && !b.saving).length;
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
                <BundleEmptyState onFiles={handleFiles} />
              ) : (
                bundles.map((bundle, i) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    index={i}
                    onSave={() => saveBundle(bundle.id)}
                    onRemove={() => removeBundle(bundle.id)}
                    onRename={(v) => setBundleName(bundle.id, v)}
                    onAttachModel={() => attachModel(bundle.id)}
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
