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
  /** A published snapshot renders with the plugins it was fixed with; a draft with the library's. */
  versionId?: number;
};

/** The preview's results are stand-ins; nothing on screen may pass for a model's answer. */
const SAMPLE_RESULTS_NOTICE =
  "Sample values to preview the layout — not computed by the model. Run a bookmark to get real predictions.";

/**
 * The schema being edited, or a snapshot, as its form, run against sample results, drawn in the
 * plugin sandbox with its plugins. A schema its plugins reject shows why instead.
 */
export function SchemaFormPreview({ schema, versionId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<SandboxedPreview | null>(null);
  // The failure of a schema and plugins shown; once either changes, it no longer applies.
  const [failure, setFailure] = useState<{
    schema: unknown;
    plugins: unknown;
    message: string;
  } | null>(null);
  const catalog = useSchemaPluginCatalog(schema, useCurrentOrganizationId() ?? "none", versionId);
  const showCatalogLoading = useStableLoading(catalog.needsPlugins && catalog.status === "loading");
  const ready = !catalog.needsPlugins || catalog.status === "ready";
  const plugins = catalog.data;

  const shown = !showCatalogLoading && ready;
  useEffect(() => {
    if (!shown || !containerRef.current) return;
    const preview = openSandboxedPreview({ container: containerRef.current });
    previewRef.current = preview;
    return () => {
      preview.close();
      previewRef.current = null;
    };
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
    previewRef.current?.show(schema, plugins).catch((error: unknown) =>
      setFailure({
        schema,
        plugins,
        message: error instanceof Error ? error.message : "The preview could not be drawn.",
      }),
    );
  }, [plugins, schema, shown]);
  const mountError =
    failure && failure.schema === schema && failure.plugins === plugins ? failure.message : null;

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
    <div className="flex size-full min-h-0 flex-col overflow-hidden rounded-card border border-line bg-surface">
      <p
        role="note"
        className="shrink-0 border-b border-info-border bg-info-subtle px-4 py-2 text-sm text-info-fg"
      >
        {SAMPLE_RESULTS_NOTICE}
      </p>
      {mountError ? <AppPanel className="m-4">{mountError}</AppPanel> : null}
      <div className={cx("min-h-0 w-full flex-1", mountError && "hidden")} ref={containerRef} />
    </div>
  );
}
