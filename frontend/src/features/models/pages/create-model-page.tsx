/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { emitErrorFromUnknown } from "@/shared/api/error-notifications";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import {
  applyInspectedBundleFiles,
  type InspectedBundleFile,
} from "@/features/models/lib/bundle-planner";
import type { Bundle } from "@/features/models/lib/bundle-types";
import { saveModelBundlesSequentially } from "@/features/models/lib/bundle-save";
import {
  DF_EXTS,
  getStem,
  isDfFile,
  isJoblibFile,
  isModelFile,
  slugToTitle,
} from "@/features/models/lib/bundle-utils";
import { BundleCard } from "@/features/models/components/BundleCard";
import { BundleDropZone } from "@/features/models/components/BundleDropZone";
import { BundleEmptyState } from "@/features/models/components/BundleEmptyState";
import { BundleSummaryPanel } from "@/features/models/components/BundleSummaryPanel";
import {
  useCreateModelMutation,
  useInspectArtifactMutation,
  useMatchArtifactsMutation,
} from "@/features/models/api/model.mutations";

export function CreateModelPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const nextIdRef = useRef(1);
  const mutation = useCreateModelMutation();
  const inspectArtifact = useInspectArtifactMutation();
  const matchArtifacts = useMatchArtifactsMutation();
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();

  // ── Ingest dropped/selected files ───────────────────────────────────────

  const handleFiles = useCallback(
    async (files: File[]) => {
      const inspected = await Promise.all(
        files.map(async (file) => {
          if (isJoblibFile(file.name)) {
            try {
              const inspection = await inspectArtifact.mutateAsync(file);
              return { file, kind: inspection.kind };
            } catch (error) {
              emitErrorFromUnknown(error);
            }
            return null;
          }
          if (isDfFile(file.name)) return { file, kind: "dataframe" as const };
          if (isModelFile(file.name)) return { file, kind: "model" as const };
          toast.error(`Unsupported file: ${file.name}. Choose a .joblib model or dataframe.`);
          return null;
        }),
      );

      const accepted = inspected.filter((item): item is InspectedBundleFile => item !== null);
      const incomingModels: File[] = [];
      const incomingDataframes: File[] = [];
      for (const item of accepted) {
        (item.kind === "model" ? incomingModels : incomingDataframes).push(item.file);
      }
      const existingModels: File[] = [];
      const existingDataframes: File[] = [];
      for (const bundle of bundles) {
        if (bundle.modelFile) existingModels.push(bundle.modelFile);
        if (bundle.dfFile) existingDataframes.push(bundle.dfFile);
      }
      const matchModels = [...existingModels, ...incomingModels];
      const matchDataframes = [...existingDataframes, ...incomingDataframes];
      const match =
        matchModels.length && matchDataframes.length
          ? await matchArtifacts
              .mutateAsync({ models: matchModels, dataframes: matchDataframes })
              .catch((error) => {
                emitErrorFromUnknown(error);
                return undefined;
              })
          : undefined;

      const firstId = nextIdRef.current;
      nextIdRef.current += accepted.length;
      setBundles(
        (prev) =>
          applyInspectedBundleFiles(prev, accepted, firstId, {
            match,
            matchModels,
            matchDataframes,
          }).bundles,
      );
    },
    [bundles, inspectArtifact.mutateAsync, matchArtifacts.mutateAsync],
  );

  // ── Bundle actions ───────────────────────────────────────────────────────

  const removeBundle = (id: number) => setBundles((prev) => prev.filter((b) => b.id !== id));

  const setBundleName = (id: number, value: string) =>
    setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, name: value } : b)));

  const setBundleOneHotSeparator = (id: number, value: string) =>
    setBundles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, oneHotSeparator: value, saved: false } : b)),
    );

  const attachFileToBundle = async (bundleId: number, file: File, kind: "model" | "dataframe") => {
    try {
      const inspection = await inspectArtifact.mutateAsync(file);
      if (inspection.kind !== kind) return;
    } catch (error) {
      emitErrorFromUnknown(error);
      return;
    }
    setBundles((prev) =>
      prev.map((b) =>
        b.id !== bundleId
          ? b
          : kind === "model"
            ? {
                ...b,
                modelFile: file,
                name: b.name.trim() ? b.name : slugToTitle(getStem(file.name)),
                saved: false,
              }
            : { ...b, dfFile: file, saved: false },
      ),
    );
  };

  const attachModel = (bundleId: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".joblib";
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (!files.length) return;
      await attachFileToBundle(bundleId, files[0], "model");
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
      await attachFileToBundle(bundleId, files[0], "dataframe");
    };
    input.click();
  };

  const saveBundle = async (id: number, options: { navigateWhenComplete?: boolean } = {}) => {
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle?.modelFile || !bundle.name.trim() || bundle.saved || bundle.saving) return false;
    const hasOtherUnsaved = bundles.some((b) => b.id !== id && !b.saved);

    setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, saving: true } : b)));
    try {
      await mutation.mutateAsync({
        name: bundle.name.trim(),
        modelFile: bundle.modelFile,
        dataframeFile: bundle.dfFile ?? undefined,
        oneHotSeparator: bundle.oneHotSeparator,
      });
      setBundles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, saved: true, saving: false } : b)),
      );
      if (options.navigateWhenComplete !== false && !hasOtherUnsaved) {
        void navigate("/models");
      }
      return true;
    } catch {
      setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, saving: false } : b)));
      return false;
    }
  };

  const saveAll = async () => {
    const unsaved = bundles.filter((b) => !b.saved);
    const complete = await saveModelBundlesSequentially(
      unsaved.map((bundle) => bundle.id),
      (id) => saveBundle(id, { navigateWhenComplete: false }),
    );
    if (complete) void navigate("/models");
  };

  // ── Derived stats ────────────────────────────────────────────────────────

  const total = bundles.length;
  const withDf = bundles.filter((b) => b.dfFile).length;
  const saved = bundles.filter((b) => b.saved).length;
  const unsavedReady = bundles.filter(
    (b) => b.modelFile && b.name.trim() && !b.saved && !b.saving,
  ).length;
  const anySaving = bundles.some((b) => b.saving);

  if (!user || error) return <NotFoundError />;
  if (workspace && !workspace.permissions.canCreateModels) return <NotFoundError />;

  return (
    <AppPage>
      <div className="app-scroll flex min-h-0 flex-1 flex-col overflow-auto px-4 py-7 sm:px-8 lg:overflow-hidden">
        <AppPageHeader
          breadcrumbs={[{ label: "Models", to: "/models" }, { label: "Create Model" }]}
          eyebrow="Model Studio"
          title="Create New Model"
          description="Drop model artifacts and dataframes. Files are grouped by name when possible."
        />

        {/* ── Two-column layout ────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
          {/* Left: drop zone + bundle list */}
          <section
            aria-label="Model bundles"
            className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)] lg:flex-1"
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
                    onOneHotSeparatorChange={(v) => setBundleOneHotSeparator(bundle.id, v)}
                    onAttachModel={() => attachModel(bundle.id)}
                    onAttachDf={() => attachDf(bundle.id)}
                    onDropModel={(file) => void attachFileToBundle(bundle.id, file, "model")}
                    onDropDf={(file) => void attachFileToBundle(bundle.id, file, "dataframe")}
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
