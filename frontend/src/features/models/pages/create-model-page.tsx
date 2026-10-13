/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppFileDropArea } from "@/shared/ui/AppFileDropArea";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { emitErrorFromUnknown } from "@/shared/api/error-notifications";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import type { Bundle } from "@/features/models/lib/bundle-types";
import { isBundleSaveable, saveModelBundlesSequentially } from "@/features/models/lib/bundle-save";
import { BUNDLE_EXT, appendBundleFiles, isBundleFile } from "@/features/models/lib/bundle-utils";
import { BundleCard } from "@/features/models/components/BundleCard";
import { BundleDropZone } from "@/features/models/components/BundleDropZone";
import { BundleSummaryPanel } from "@/features/models/components/BundleSummaryPanel";
import {
  useCreateModelMutation,
  useInspectArtifactMutation,
} from "@/features/models/api/model.mutations";

export function CreateModelPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const nextIdRef = useRef(1);
  const mutation = useCreateModelMutation();
  const inspectArtifact = useInspectArtifactMutation();
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();

  // ── Ingest dropped/selected files ───────────────────────────────────────

  const handleFiles = useCallback(
    async (files: File[]) => {
      const inspected = await Promise.all(
        files.map(async (file) => {
          if (!isBundleFile(file.name)) {
            toast.error(
              `Unsupported file: ${file.name}. Choose a ${BUNDLE_EXT} file exported with mlbundle.`,
            );
            return null;
          }
          try {
            await inspectArtifact.mutateAsync(file);
            return file;
          } catch (error) {
            emitErrorFromUnknown(error);
            return null;
          }
        }),
      );
      const accepted = inspected.filter((file): file is File => file !== null);
      const firstId = nextIdRef.current;
      nextIdRef.current += accepted.length;
      setBundles((prev) => appendBundleFiles(prev, accepted, firstId));
    },
    [inspectArtifact.mutateAsync],
  );

  // ── Bundle actions ───────────────────────────────────────────────────────

  const removeBundle = (id: number) => setBundles((prev) => prev.filter((b) => b.id !== id));

  const patchBundle = (id: number, changes: Partial<Bundle>) =>
    setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));

  const saveBundle = async (id: number, options: { navigateWhenComplete?: boolean } = {}) => {
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle || !isBundleSaveable(bundle)) return false;
    const hasOtherUnsaved = bundles.some((b) => b.id !== id && !b.saved);

    patchBundle(id, { saving: true });
    try {
      await mutation.mutateAsync({ name: bundle.name.trim(), modelFile: bundle.modelFile });
      patchBundle(id, { saved: true, saving: false });
      if (options.navigateWhenComplete !== false && !hasOtherUnsaved) {
        void navigate("/models");
      }
      return true;
    } catch {
      patchBundle(id, { saving: false });
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
  const saved = bundles.filter((b) => b.saved).length;
  const unsavedReady = bundles.filter(isBundleSaveable).length;
  const anySaving = bundles.some((b) => b.saving);

  if (!user || error) return <NotFoundError />;
  if (workspace && !workspace.permissions.canCreateModels) return <NotFoundError />;

  return (
    <AppPage>
      <AppSurface className="app-scroll flex flex-1 flex-col gap-6 overflow-auto lg:overflow-hidden">
        <AppPageHeader
          breadcrumbs={[{ label: "Models", to: "/models" }, { label: "Create model" }]}
          title="Create model"
          description="Drop .mlbundle files exported with mlbundle. Each one carries its model and schema."
        />

        {/* ── Two-column layout ────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
          {/* Left: drop zone + bundle list */}
          <section
            aria-label="Model bundles"
            className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card lg:flex-1"
          >
            <BundleDropZone onFiles={handleFiles} />

            <div className="app-scroll mt-4 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto border-t border-line px-4 pb-4 pt-3">
              {bundles.length === 0 ? (
                <AppFileDropArea
                  accept={BUNDLE_EXT}
                  inputLabel="Upload bundle files from the empty list"
                  label="Drop bundle files"
                  onFiles={handleFiles}
                >
                  <AppEmptyState
                    compact
                    icon={<SECTION_ICONS.models size={18} />}
                    title="No bundles yet"
                    description="Drop files here or click to browse."
                  />
                </AppFileDropArea>
              ) : (
                bundles.map((bundle) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    onSave={() => saveBundle(bundle.id)}
                    onRemove={() => removeBundle(bundle.id)}
                    onRename={(name) => patchBundle(bundle.id, { name })}
                  />
                ))
              )}
            </div>
          </section>

          {/* Right: summary panel */}
          <BundleSummaryPanel
            total={total}
            saved={saved}
            unsavedReady={unsavedReady}
            anySaving={anySaving}
            onSaveAll={saveAll}
            onClear={() => setBundles([])}
          />
        </div>
      </AppSurface>
    </AppPage>
  );
}
