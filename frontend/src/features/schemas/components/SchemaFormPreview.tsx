/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createMlRegistryPack } from "mlform/builtins";
import { mountForm, registerDefinedFieldKind, registerDefinedReportKind } from "mlform/kit";
import type { MountedForm } from "mlform/kit";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { toMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/custom-report-catalog";
import {
  createSchemaPreviewTransport,
  prepareSchemaPreviewReports,
} from "@/features/schemas/lib/preview-transport";
import { getPredictionDesignSystem } from "@/capabilities/prediction-runtime/mlform/headless-prediction";
import { useSchemaPluginCatalog } from "@/features/schemas/lib/schema-plugin-catalog";

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
  const catalog = useSchemaPluginCatalog(schema);
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
    const pack = createMlRegistryPack();
    catalog.data.fieldDefinitions.forEach((definition) => {
      registerDefinedFieldKind(pack.registry, pack.descriptorRegistry, definition.definition);
    });
    resolvedSchema.reportDefinitions.forEach((definition) => {
      registerDefinedReportKind(pack.registry, pack.descriptorRegistry, definition.definition);
    });
    mountedRef.current?.unmount();
    setMountError(null);
    try {
      mountedRef.current = mountForm(containerRef.current, {
        schema: resolvedSchema.schema,
        registry: pack.registry,
        descriptorRegistry: pack.descriptorRegistry,
        primitiveRegistry: createBuiltinPrimitiveRegistry(),
        transport: createSchemaPreviewTransport(),
        layout: { kind: "split" },
        reportPane: "always",
        reportFetchMode: "none",
        labels: {
          form: "Schema Inputs",
          reports: "Preview Results",
          submit: "Run Preview",
          validating: "Checking schema...",
          submitting: "Rendering preview...",
        },
        designSystem: getPredictionDesignSystem(initialTheme),
      });
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
    <div className="size-full min-h-0 overflow-hidden rounded border border-line bg-surface">
      {resolvedSchema.status === "error" || mountError ? (
        <AppPanel className="m-4">
          {resolvedSchema.status === "error" ? resolvedSchema.message : mountError}
        </AppPanel>
      ) : null}
      {resolvedSchema.status === "ready" ? (
        <div
          className={`size-full min-h-0 overflow-auto ${mountError ? "hidden" : ""}`}
          ref={containerRef}
        />
      ) : null}
    </div>
  );
}
