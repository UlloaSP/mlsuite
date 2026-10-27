/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest } from "mlform/runtime";
import {
  createSchemaRunTransport,
  type SchemaRunTarget,
} from "@/capabilities/prediction-runtime/mlform/run-transport";
import {
  isRecord,
  type JsonRecord,
  type PredictionPayloadField,
} from "@/capabilities/prediction-runtime/mlform/shared";
import { appFetch, isHttpError, json } from "@/shared/api/http";
import { getBackendBaseUrl } from "@/shared/config/runtime";
import type { SchemaModelBindingDto } from "@/shared/api/openapi.gen";
import { openPluginSandbox, type PluginSandbox } from "./plugin-sandbox";
import type { PluginCatalog, PublicRunReport, SandboxSizing } from "./sandbox-protocol";

type RunResultCallback = (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;

type Binding = Pick<SchemaModelBindingDto, "modelId" | "modelName" | "pluginPolicy">;

type Common = {
  container: HTMLElement;
  schema: unknown;
  plugins: PluginCatalog;
  /** The view could not be drawn, often because the schema is not valid for its plugins. */
  onMountError?: (error: Error) => void;
};

export type MountedSandboxedForm = { unmount(): void };

const mountView = (
  sandbox: PluginSandbox,
  view: Parameters<PluginSandbox["mount"]>[0],
  onMountError?: (error: Error) => void,
) => void sandbox.mount(view).catch((error: Error) => onMountError?.(error));

const explanationPath = (modelId: number) =>
  `/api/analyzer/explanations?modelId=${encodeURIComponent(modelId)}`;

/**
 * A workspace run form drawn in the plugin sandbox. The sandbox submits the form's values; the
 * app asks the server to run them against the bookmark's snapshot through the run transport and
 * hands the sealed results back for the reports to draw. A report may ask for an explanation of
 * a model the form runs, and nothing else; such a payload is only shown, never saved.
 */
export const mountSandboxedSchemaRunForm = ({
  container,
  target,
  schema,
  plugins,
  bindings,
  onSubmit,
  onResultUpdate,
  onSubmitError,
  onRunningChange,
  onMountError,
}: Common & {
  target: SchemaRunTarget;
  bindings: readonly Binding[];
  onSubmit: RunResultCallback;
  onResultUpdate?: RunResultCallback;
  onSubmitError?: (error: Error) => void;
  onRunningChange?: (running: boolean) => void;
}): MountedSandboxedForm => {
  const sandbox = openPluginSandbox({
    container,
    title: "Prediction form",
    sizing: "fill",
    className: "h-full",
    handlers: {
      async submit({ request, fields }) {
        const transport = createSchemaRunTransport(
          target,
          bindings,
          fields as PredictionPayloadField[],
        );
        const response = await transport.submit({
          ...request,
          fields: [],
        } as unknown as SubmitRequest);
        return isRecord(response) ? response : {};
      },
      async explain({ modelId, body }) {
        if (!bindings.some((binding) => binding.modelId === modelId))
          return { status: 403, body: "This form does not run that model." };
        try {
          return {
            status: 200,
            body: await appFetch(explanationPath(modelId), json("POST", body)),
          };
        } catch (error) {
          const status = isHttpError(error) && error.status >= 400 ? error.status : 502;
          return { status, body: error instanceof Error ? error.message : String(error) };
        }
      },
    },
    onEvent(event) {
      if (event.name === "running") onRunningChange?.(event.payload.running);
      else if (event.name === "run-settled")
        onSubmit(event.payload.inputData, event.payload.raw, event.payload.reportsPending);
      else if (event.name === "run-updated")
        onResultUpdate?.(event.payload.inputData, event.payload.raw, event.payload.reportsPending);
      else if (event.name === "submit-error") onSubmitError?.(new Error(event.payload.message));
    },
  });
  mountView(
    sandbox,
    {
      kind: "run",
      schema,
      bindings: bindings.map(({ modelId, modelName, pluginPolicy }) => ({
        modelId,
        modelName,
        pluginPolicy,
      })),
      plugins,
      backendUrl: getBackendBaseUrl(),
    },
    onMountError,
  );
  return { unmount: () => sandbox.destroy() };
};

export type MountedSandboxedPublicForm = MountedSandboxedForm & {
  /** Shows or withholds the Run action; the fields and the shown result are left as they are. */
  setRunOffered(offered: boolean): void;
  setSizing(sizing: SandboxSizing): void;
};

/**
 * A public form drawn in the plugin sandbox. `run` makes the run, as the page's own request,
 * and resolves with the reports that answered, or with null when no run was made; when it
 * throws, the failure is the page's to tell (`onRunError`) and the form shows no result.
 */
export const mountSandboxedPublicRunForm = ({
  container,
  schema,
  plugins,
  sizing,
  run,
  onRunningChange,
  onRunError,
  onMountError,
}: Common & {
  sizing: SandboxSizing;
  run: (values: JsonRecord) => Promise<readonly PublicRunReport[] | null>;
  onRunningChange?: (running: boolean) => void;
  onRunError?: (error: unknown) => void;
}): MountedSandboxedPublicForm => {
  const sandbox = openPluginSandbox({
    container,
    title: "Public form",
    sizing,
    className: "h-full",
    handlers: {
      async "public-run"({ values }) {
        try {
          const reports = await run(values);
          return reports ? { status: "answered", reports: [...reports] } : { status: "withheld" };
        } catch (error) {
          onRunError?.(error);
          return { status: "failed" };
        }
      },
    },
    onEvent(event) {
      if (event.name === "running") onRunningChange?.(event.payload.running);
      else if (event.name === "submit-error") onRunError?.(new Error(event.payload.message));
    },
  });
  mountView(sandbox, { kind: "public-run", schema, plugins }, onMountError);
  let runOffered = true;
  return {
    setRunOffered(offered) {
      if (offered === runOffered) return;
      runOffered = offered;
      void sandbox.request("run-offered", { offered }).catch(() => {});
    },
    setSizing: (next) => sandbox.setSizing(next),
    unmount: () => sandbox.destroy(),
  };
};

export type SandboxedPreview = {
  /** Shows the schema's form in place of the last one; only the last schema's failure is told. */
  show(schema: unknown, plugins: PluginCatalog): void;
  close(): void;
};

/**
 * A schema editor's preview form, run against stand-in results, in one plugin sandbox kept for
 * every version of the schema the editor previews.
 */
export const openSandboxedPreview = ({
  container,
  onMountError,
}: Pick<Common, "container" | "onMountError">): SandboxedPreview => {
  const sandbox = openPluginSandbox({
    container,
    title: "Schema preview",
    sizing: "fill",
    className: "h-full",
  });
  let shown = 0;
  return {
    show(schema, plugins) {
      const current = ++shown;
      void sandbox
        .mount({ kind: "preview", schema, plugins })
        .catch((error: Error) => current === shown && onMountError?.(error));
    },
    close: () => sandbox.destroy(),
  };
};
