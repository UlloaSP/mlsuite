/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import {
  type AfterSubmitContext,
  type FormController,
  type SubmitErrorContext,
} from "mlform/runtime";
import { createPredictionPrimitiveRegistry } from "./primitive-registry";
import { createSchemaRunRuntime } from "./schema-run-runtime";
import { getPredictionDesignSystem } from "./headless-prediction";
import {
  type JsonRecord,
  type MountedPredictionForm,
  type PredictionTheme,
  isRecord,
} from "../../../algorithms/mlform/shared";
import type { CatalogFieldDefinition } from "../../../plugin/mlform/custom-field";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import { schemaRunDebug, schemaRunDebugError } from "../../../algorithms/schema/run-debug";
import {
  buildSchemaRunRawFromSubmitResult,
  reportStatesFromSnapshot,
} from "../../../algorithms/mlform/schema-run-result-state";

type Options = {
  container: HTMLElement;
  schema: unknown;
  bindings: readonly {
    modelId: string;
    pluginPolicy?: JsonRecord | null;
  }[];
  theme: PredictionTheme;
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
  onSubmit?: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onSubmitError?: (error: unknown) => void;
};

export const mountSchemaRunForm = ({
  container,
  schema,
  bindings,
  theme,
  customFieldDefinitions = [],
  customReportDefinitions = [],
  onSubmit,
  onSubmitError,
}: Options): MountedPredictionForm => {
  schemaRunDebug("mount.start", {
    bindings: bindings.length,
    customFields: customFieldDefinitions.map((definition) => definition.kind),
    customReports: customReportDefinitions.map((definition) => definition.kind),
  });
  const runtime = createSchemaRunRuntime({
    schema,
    bindings,
    customFieldDefinitions,
    customReportDefinitions,
  });
  let mountedForm: FormController | null = null;
  const mounted = mountForm(container, {
    schema: runtime.formSchema,
    registry: runtime.registry,
    descriptorRegistry: runtime.descriptorRegistry,
    primitiveRegistry: createPredictionPrimitiveRegistry(),
    transport: runtime.transport,
    hooks: {
      async afterSubmit({ result }: AfterSubmitContext) {
        const raw = isRecord(result.raw) ? result.raw : { raw: result.raw };
        const next = mountedForm
          ? buildSchemaRunRawFromSubmitResult(
              raw,
              mountedForm.reports,
              reportStatesFromSnapshot(mountedForm.state.reportStates),
              bindings,
            )
          : { raw, reportsPending: false };
        schemaRunDebug("mount.after-submit", {
          reportKeys: isRecord(next.raw.reports) ? Object.keys(next.raw.reports) : [],
          reportsPending: next.reportsPending,
        });
        onSubmit?.(
          isRecord(next.raw.inputData) ? next.raw.inputData : {},
          next.raw,
          next.reportsPending,
        );
      },
      onSubmitError({ error }: SubmitErrorContext) {
        schemaRunDebugError("mount.submit-error", error);
        onSubmitError?.(error);
      },
    },
    layout: { kind: "split" },
    reportPane: "always",
    labels: {
      form: "Schema Inputs",
      reports: "Model Results",
      submit: "Run Schema",
      validating: "Checking schema...",
      submitting: "Running models...",
    },
    designSystem: getPredictionDesignSystem(theme),
  });
  mountedForm = mounted.form;
  return {
    form: mounted.form,
    host: mounted.host,
    updateTheme(nextTheme) {
      mounted.replaceDesignSystem(getPredictionDesignSystem(nextTheme));
    },
    unmount() {
      schemaRunDebug("mount.unmount");
      mounted.unmount();
    },
  };
};
