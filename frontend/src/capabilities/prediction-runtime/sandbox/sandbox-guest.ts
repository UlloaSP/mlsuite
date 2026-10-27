/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import {
  createMlformJsonSchema,
  validateMlformSchema,
} from "@/capabilities/prediction-runtime/mlform/schema-validation";
import {
  compilePluginCatalog,
  inspectPluginSources,
} from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { mountSandboxView, type SandboxGuestView } from "./guest-views";
import { createSandboxChannel } from "./sandbox-channel";
import {
  appMethods,
  sandboxMethods,
  toJsonData,
  type AppEvents,
  type AppMethods,
  type SandboxMethods,
  type SandboxSizing,
  type SandboxTheme,
} from "./sandbox-protocol";
import { applySandboxTheme } from "./sandbox-theme";

const definitionsOf = async (plugins: Parameters<typeof compilePluginCatalog>[0]) => {
  const compiled = await compilePluginCatalog(plugins);
  return {
    customFieldDefinitions: compiled.fieldDefinitions,
    customReportDefinitions: compiled.reportDefinitions,
  };
};

/**
 * Starts the plugin sandbox document: it answers only its parent window, the app, and draws one
 * view at a time, a new one replacing the last. Plugin code runs here, in an opaque origin with
 * no network, and sees only what the app sends.
 */
export const startPluginSandbox = (
  root: HTMLElement,
  {
    listener = window,
    parent = window.parent,
    scope = globalThis,
  }: {
    /** The window the app's messages arrive on. */
    listener?: Window;
    /** The app's window, the only one answered. */
    parent?: Window;
    /** The global whose `fetch` a run form's reports use. */
    scope?: Pick<typeof globalThis, "fetch">;
  } = {},
) => {
  const html = document.documentElement;
  let theme: SandboxTheme | null = null;
  let view: SandboxGuestView | null = null;
  let mounting: Promise<unknown> = Promise.resolve();
  let runOffered = true;
  const applySizing = (sizing: SandboxSizing) => {
    html.dataset.sizing = sizing;
  };

  const app = createSandboxChannel<SandboxMethods, AppMethods, Record<never, never>, AppEvents>({
    listener,
    peer: () => (parent === listener ? null : parent),
    serves: sandboxMethods,
    calls: appMethods,
    hears: {},
    handlers: {
      mount(params) {
        // Views are drawn in the order they were asked for; each replaces the one before.
        const shown = mounting.then(async () => {
          view?.unmount();
          view = null;
          theme = params.theme;
          applySandboxTheme(theme, html);
          applySizing(params.sizing);
          try {
            view = await mountSandboxView(root, params.view, theme.mode, app, scope);
          } catch (error) {
            root.replaceChildren();
            throw error;
          }
          if (theme.mode !== params.theme.mode) view.updateTheme(theme.mode);
          view.setRunOffered?.(runOffered);
          return { rendered: view.rendered };
        });
        mounting = shown.catch(() => {});
        return shown;
      },
      async theme(next) {
        theme = next;
        applySandboxTheme(next, html);
        view?.updateTheme(next.mode);
        return null;
      },
      async sizing({ sizing }) {
        applySizing(sizing);
        return null;
      },
      async "run-offered"({ offered }) {
        runOffered = offered;
        view?.setRunOffered?.(offered);
        return null;
      },
      inspect: ({ sources }) => inspectPluginSources(sources),
      async "check-schema"({ schema, plugins }) {
        const { success, issues } = validateMlformSchema(schema, await definitionsOf(plugins));
        return { success, issues };
      },
      async "json-schema"({ plugins }) {
        return toJsonData(createMlformJsonSchema(await definitionsOf(plugins))) as Record<
          string,
          unknown
        >;
      },
      async "prepare-run"({ schema, bindings, plugins }) {
        const runtime = createSchemaRunRuntime({
          schema,
          bindings,
          ...(await definitionsOf(plugins)),
        });
        return toJsonData({
          fields: runtime.normalizedFields as unknown as Record<string, unknown>[],
          reports: runtime.formSchema.reports as Record<string, unknown>[],
        });
      },
    },
  });

  // The app sizes a frame drawn at its content's height by what this reports.
  new ResizeObserver(() => app.emit("resize", { height: root.scrollHeight })).observe(root);
  app.emit("ready", {});
};
