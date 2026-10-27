/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { cx } from "@/shared/ui/cx";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { useSchemaPluginCatalog } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import {
  openSandboxedPreview,
  type SandboxedPreview,
} from "@/capabilities/prediction-runtime/sandbox/sandboxed-forms";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";

type Props = {
  schema: unknown;
};

/**
 * The schema being edited as its form, run against stand-in results, drawn in the plugin
 * sandbox with the organization's plugins. A schema its plugins reject shows why instead.
 */
export function SchemaFormPreview({ schema }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<SandboxedPreview | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);
  const catalog = useSchemaPluginCatalog(schema, useCurrentOrganizationId() ?? "none");
  const showCatalogLoading = useStableLoading(catalog.needsPlugins && catalog.status === "loading");
  const ready = !catalog.needsPlugins || catalog.status === "ready";
  const plugins = catalog.data;

  const shown = !showCatalogLoading && ready;
  useEffect(() => {
    if (!shown || !containerRef.current) return;
    const preview = openSandboxedPreview({
      container: containerRef.current,
      onMountError: (error) => setMountError(error.message),
    });
    previewRef.current = preview;
    return () => {
      preview.close();
      previewRef.current = null;
    };
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
    setMountError(null);
    previewRef.current?.show(schema, plugins);
  }, [plugins, schema, shown]);

  if (showCatalogLoading) return <AppLoadingState compact label="Loading plugin catalog." />;
  if (!ready) {
    return (
      <AppPanel className="space-y-4">
        <AppCopy>{catalog.error}</AppCopy>
        <AppButton type="button" onClick={() => void catalog.retry()}>
          <RefreshCcw size={16} />
          Retry
        </AppButton>
      </AppPanel>
    );
  }

  return (
    <div className="size-full min-h-0 overflow-hidden rounded-card border border-line bg-surface">
      {mountError ? <AppPanel className="m-4">{mountError}</AppPanel> : null}
      <div className={cx("size-full min-h-0", mountError && "hidden")} ref={containerRef} />
    </div>
  );
}
