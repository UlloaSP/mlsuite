/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { createMlRegistryPack } from "mlform/builtins";
import { mountForm, registerDefinedFieldKind, registerDefinedReportKind } from "mlform/kit";
import type { MountedForm } from "mlform/kit";
import { themeWithHtmlAtom } from "../../app/atoms";
import { AppButton } from "../../app/components/AppButton";
import { AppCopy } from "../../app/components/AppCopy";
import { AppPanel } from "../../app/components/AppPanel";
import { toMlformSchema } from "../../algorithms/mlform/schema-validation";
import { toMlformRuntimeSchema } from "../../algorithms/mlform/schema-runtime-adapter";
import { wrapSchemaReportDefinitions } from "../../algorithms/schema/report-plugin-context";
import {
  createSchemaPreviewTransport,
  expandSchemaPreviewReports,
} from "../../algorithms/schema/preview-transport";
import { createPredictionPrimitiveRegistry } from "../../app/utils/mlform/primitive-registry";
import { getPredictionDesignSystem } from "../../app/utils/mlform/headless-prediction";
import { useSchemaPluginCatalog } from "../useSchemaPluginCatalog";

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
  const catalog = useSchemaPluginCatalog(schema);

  const resolvedSchema = useMemo<ResolvedSchema>(() => {
    if (catalog.needsPlugins && catalog.status !== "ready") return { status: "pending" };
    try {
      const reportDefinitions = wrapSchemaReportDefinitions(catalog.data.reportDefinitions);
      return {
        status: "ready",
        schema: toMlformSchema(toMlformRuntimeSchema(expandSchemaPreviewReports(schema)), {
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
      designSystem: getPredictionDesignSystem(theme),
    });
    return () => {
      mountedRef.current?.unmount();
      mountedRef.current = null;
    };
  }, [catalog.data.fieldDefinitions, resolvedSchema, theme]);

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
    <div className="size-full min-h-0 overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)]">
      {resolvedSchema.status === "error" ? (
        <AppPanel className="m-4">{resolvedSchema.message}</AppPanel>
      ) : (
        <div className="size-full min-h-0 overflow-auto" ref={containerRef} />
      )}
    </div>
  );
}
