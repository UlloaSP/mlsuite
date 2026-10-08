/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { mountForm } from "mlform/kit";
import { defineMLFormPlugin } from "mlform/view";
import type { MountedForm } from "mlform/kit";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { cx } from "@/shared/ui/cx";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { toMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";
import { createMlSuiteRegistry } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { connectStoredStatusConditions } from "@/capabilities/prediction-runtime/mlform/stored-status-conditions";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import {
  createSchemaPreviewTransport,
  prepareSchemaPreviewReports,
} from "@/features/schemas/lib/preview-transport";
import { getPredictionDesignSystem } from "@/capabilities/prediction-runtime/mlform/headless-prediction";
import { useSchemaPluginCatalog } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { MLFORM_SPLIT_CONTAINER_CLASS } from "@/capabilities/prediction-runtime/mlform/split-layout";

type Props = {
  schema: unknown;
};

type ResolvedSchema =
  | { status: "pending" }
  | {
      status: "ready";
      schema: ReturnType<typeof toMlformSchema>;
      reportDefinitions: readonly CatalogReportDefinition[];
    }
  | { status: "error"; message: string };

export function SchemaFormPreview({ schema }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<MountedForm | null>(null);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [initialTheme] = useState(theme);
  const [mountError, setMountError] = useState<string | null>(null);
  const catalog = useSchemaPluginCatalog(schema, useCurrentOrganizationId() ?? "none");
  const showCatalogLoading = useStableLoading(catalog.needsPlugins && catalog.status === "loading");

  const resolvedSchema = useMemo<ResolvedSchema>(() => {
    if (catalog.needsPlugins && catalog.status !== "ready") return { status: "pending" };
    try {
      const reportDefinitions = catalog.data.reportDefinitions;
      return {
        status: "ready",
        schema: toMlformSchema(prepareSchemaPreviewReports(schema), {
          customFieldDefinitions: catalog.data.fieldDefinitions,
          customReportDefinitions: reportDefinitions,
        }),
        reportDefinitions,
      };
    } catch (error) {
      return { status: "error", message: error instanceof Error ? error.message : String(error) };
    }
  }, [
    catalog.data.fieldDefinitions,
    catalog.data.reportDefinitions,
    catalog.needsPlugins,
    catalog.status,
    schema,
  ]);

  useEffect(() => {
    if (showCatalogLoading || !containerRef.current || resolvedSchema.status !== "ready") return;
    mountedRef.current?.unmount();
    setMountError(null);
    try {
      mountedRef.current = mountForm(containerRef.current, {
        schema: resolvedSchema.schema,
        registry: createMlSuiteRegistry(),
        plugins: [
          defineMLFormPlugin({
            fields: catalog.data.fieldDefinitions.map((item) => item.definition),
            reports: resolvedSchema.reportDefinitions.map((item) => item.definition),
          }),
        ],
        primitiveRegistry: createBuiltinPrimitiveRegistry(),
        transport: createSchemaPreviewTransport(),
        layout: { kind: "split" },
        reportPane: "always",
        reportFetchMode: "none",
        labels: {
          form: "Schema inputs",
          reports: "Preview results",
          submit: "Run preview",
          validating: "Checking schema…",
          submitting: "Rendering preview…",
        },
        designSystem: getPredictionDesignSystem(initialTheme),
      });
      connectStoredStatusConditions(mountedRef.current.form);
    } catch (error) {
      mountedRef.current = null;
      setMountError(error instanceof Error ? error.message : String(error));
    }
    const mounted = mountedRef.current;
    return () => {
      mounted?.unmount();
      if (mountedRef.current === mounted) mountedRef.current = null;
    };
  }, [catalog.data.fieldDefinitions, initialTheme, resolvedSchema, showCatalogLoading]);

  useEffect(() => {
    mountedRef.current?.replaceDesignSystem(getPredictionDesignSystem(theme));
  }, [theme]);

  if (showCatalogLoading) return <AppLoadingState compact label="Loading plugin catalog." />;
  if (catalog.needsPlugins && catalog.status !== "ready") {
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
      {resolvedSchema.status === "error" || mountError ? (
        <AppPanel className="m-4">
          {resolvedSchema.status === "error" ? resolvedSchema.message : mountError}
        </AppPanel>
      ) : null}
      {resolvedSchema.status === "ready" ? (
        <div
          className={cx(
            "size-full min-h-0 overflow-auto",
            MLFORM_SPLIT_CONTAINER_CLASS,
            mountError && "hidden",
          )}
          ref={containerRef}
        />
      ) : null}
    </div>
  );
}
