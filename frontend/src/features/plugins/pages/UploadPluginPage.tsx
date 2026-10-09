/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { FileCode2 } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useUploadPluginMutation } from "@/features/plugins/api/plugin.mutations";
import { PluginUploadCard } from "@/features/plugins/components/PluginUploadCard";
import { PluginUploadSummary } from "@/features/plugins/components/PluginUploadSummary";
import {
  PLUGIN_FILE_EXTENSION,
  type PluginUploadItem,
  inspectPluginFile,
  isUploadable,
  pluginErrorMessage,
} from "@/features/plugins/lib/plugin-upload-queue";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppFileDropArea } from "@/shared/ui/AppFileDropArea";
import { AppFileDropZone } from "@/shared/ui/AppFileDropZone";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";

const PLUGIN_FILE_ACCEPT = `${PLUGIN_FILE_EXTENSION},text/typescript,application/typescript,text/plain`;

export function UploadPluginPage() {
  const navigate = useNavigate();
  const { data: workspace } = useWorkspaceContext();
  const organizationId = workspace?.currentOrganization.id ?? "none";
  const uploadMutation = useUploadPluginMutation();
  const [items, setItems] = useState<PluginUploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const nextIdRef = useRef(1);

  const update = (id: number, patch: Partial<PluginUploadItem>) =>
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addFiles = async (files: File[]) => {
    const added = files.map((file) => ({
      id: nextIdRef.current++,
      file,
      status: "checking" as const,
    }));
    setItems((previous) => [...previous, ...added]);
    await Promise.all(
      added.map(async (item) =>
        update(item.id, await inspectPluginFile(organizationId, item.file)),
      ),
    );
  };

  const uploadAll = async () => {
    const queue = items.filter(isUploadable);
    let failed = false;
    setUploading(true);
    // One at a time: each upload locks the organization's catalog on the API.
    for (const item of queue) {
      update(item.id, { status: "uploading", error: undefined });
      try {
        await uploadMutation.mutateAsync(item.file);
        update(item.id, { status: "uploaded" });
      } catch (error: unknown) {
        failed = true;
        update(item.id, { status: "failed", error: pluginErrorMessage(error) });
      }
    }
    setUploading(false);
    if (failed) return;
    toast.success(`${queue.length} plugin${queue.length === 1 ? "" : "s"} uploaded.`);
    // Invalid files stay on screen so their reason is not lost.
    if (items.every((item) => item.status !== "invalid")) void navigate("/plugins");
  };

  const count = (predicate: (item: PluginUploadItem) => boolean) => items.filter(predicate).length;

  return (
    <AppPage>
      <AppSurface className="app-scroll flex flex-1 flex-col gap-6 overflow-auto lg:overflow-hidden">
        <AppPageHeader
          breadcrumbs={[{ label: "Plugins", to: "/plugins" }, { label: "Upload plugins" }]}
          title="Upload plugins"
          description="Drop plugin source files. Each file is validated as a field or report plugin before it can be uploaded."
        />

        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
          <section
            aria-label="Plugin files"
            className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card lg:flex-1"
          >
            <AppFileDropZone
              accept={PLUGIN_FILE_ACCEPT}
              hints={[`plugins: ${PLUGIN_FILE_EXTENSION} (field or report)`]}
              inputLabel="Upload plugin files"
              onFiles={addFiles}
            />

            <div className="app-scroll mt-4 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto border-t border-line px-4 pb-4 pt-3">
              {items.length === 0 ? (
                <AppFileDropArea
                  accept={PLUGIN_FILE_ACCEPT}
                  inputLabel="Upload plugin files from the empty list"
                  label="Drop plugin files"
                  onFiles={addFiles}
                >
                  <AppEmptyState
                    compact
                    icon={<FileCode2 size={18} />}
                    title="No plugin files yet"
                    description="Drop files here or click to browse. Nothing is uploaded until you choose Upload all."
                  />
                </AppFileDropArea>
              ) : (
                items.map((item) => (
                  <PluginUploadCard
                    key={item.id}
                    item={item}
                    onRemove={() =>
                      setItems((previous) => previous.filter(({ id }) => id !== item.id))
                    }
                  />
                ))
              )}
            </div>
          </section>

          <PluginUploadSummary
            total={items.length}
            uploadable={count(isUploadable)}
            invalid={count((item) => item.status === "invalid")}
            uploaded={count((item) => item.status === "uploaded")}
            busy={uploading || items.some((item) => item.status === "checking")}
            uploading={uploading}
            onUploadAll={() => void uploadAll()}
            onClear={() => setItems([])}
          />
        </div>
      </AppSurface>
    </AppPage>
  );
}
