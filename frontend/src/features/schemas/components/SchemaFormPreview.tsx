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
import { themeWithHtmlAtom } from "@/shared/ui/ui-state";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { toMlformSchema } from "@/capabilities/mlform/schema-validation";
import { toMlformRuntimeSchema } from "@/capabilities/mlform/schema-runtime-adapter";
import { wrapSchemaReportDefinitions } from "@/capabilities/mlform/report-plugin-context";
import {
  createSchemaPreviewTransport,
  prepareSchemaPreviewReports,
} from "@/features/schemas/lib/preview-transport";
import { createPredictionPrimitiveRegistry } from "@/capabilities/mlform/primitive-registry";
import { getPredictionDesignSystem } from "@/capabilities/mlform/headless-prediction";
import { useSchemaPluginCatalog } from "@/features/schemas/lib/schema-plugin-catalog";

type Props = {
  schema: unknown;
};

type ResolvedSchema =
  | { status: "pending" }
  | {
      status: "ready";
      schema: ReturnType<typeof toMlformSchema>;
      reportDefinitions: ReturnType<typeof wrapSchemaReportDefinitions>;
    }
  | { status: "error"; message: string };

export function SchemaFormPreview({ schema }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<MountedForm | null>(null);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [initialTheme] = useState(theme);
  const [mountError, setMountError] = useState<string | null>(null);
  const catalog = useSchemaPluginCatalog(schema);

  const resolvedSchema = useMemo<ResolvedSchema>(() => {
    if (catalog.needsPlugins && catalog.status !== "ready") return { status: "pending" };
    try {
      const reportDefinitions = wrapSchemaReportDefinitions(catalog.data.reportDefinitions);
      return {
        status: "ready",
        schema: toMlformSchema(toMlformRuntimeSchema(prepareSchemaPreviewReports(schema)), {
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
    if (!containerRef.current || resolvedSchema.status !== "ready") return;
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
        primitiveRegistry: createPredictionPrimitiveRegistry(),
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
  }, [catalog.data.fieldDefinitions, initialTheme, resolvedSchema]);

  useEffect(() => {
    mountedRef.current?.replaceDesignSystem(getPredictionDesignSystem(theme));
  }, [theme]);

  if (catalog.needsPlugins && catalog.status !== "ready") {
    return (
      <AppPanel className="space-y-4">
        <AppCopy>
          {catalog.status === "loading" ? "Loading plugin catalog." : catalog.error}
        </AppCopy>
        {catalog.status === "error" ? (
          <AppButton type="button" onClick={() => void catalog.retry()}>
            <RefreshCcw size={16} />
            Retry
          </AppButton>
        ) : null}
      </AppPanel>
    );
  }

  return (
    <div className="size-full min-h-0 overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)]">
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
