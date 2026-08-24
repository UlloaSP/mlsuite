/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { Provider, createStore } from "jotai";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { themeWithHtmlAtom } from "@/shared/ui/ui-state";
import { SchemaRunForm } from "@/features/schemas/components/SchemaRunForm";
import { CreateSchemaRunPage } from "@/features/schemas/pages/create-schema-run-page";
import { getSchemaRunSaveAction } from "@/features/schemas/lib/schema-run-save-action";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";

const mountState = vi.hoisted(() => ({
  mount: vi.fn(),
  unmount: vi.fn(),
  updateTheme: vi.fn(),
}));
const catalogState = vi.hoisted(() => ({
  data: { fieldDefinitions: [], reportDefinitions: [] },
  error: "",
  needsPlugins: false,
  retry: vi.fn(),
  status: "ready",
}));
const pageState = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  version: null as SchemaVersionDto | null,
}));

vi.mock("@/capabilities/prediction-runtime/mlform/schema-run-mount", () => ({
  mountSchemaRunForm: mountState.mount,
}));

vi.mock("@/features/schemas/lib/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => catalogState,
}));

vi.mock("@/features/schemas/api/schema-queries", () => ({
  usePredictionRun: () => ({ data: undefined }),
  useSchema: () => ({ data: { name: "Risk schema" } }),
  useSchemaBookmark: () => ({ data: { versionId: "version-1" } }),
  useSchemaVersion: () => ({ data: pageState.version, isLoading: false }),
}));

vi.mock("@/features/schemas/api/schema-prediction-mutations", () => ({
  useCreatePredictionRunForBookmarkMutation: () => ({
    isPending: false,
    mutateAsync: pageState.mutateAsync,
  }),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Snapshot 1",
  formSchema: {
    fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
    reports: [
      {
        id: "score",
        label: "Score",
        kind: "regressor",
        mappedTo: { "model-1": "score" },
      },
    ],
  },
  bindings: [{ modelId: "model-1" }],
  createdAt: "",
};

const completedRaw = {
  results: [
    {
      modelId: "model-1",
      modelInput: { age: 42 },
      output: { reports: [{ mappedTo: "score", value: 0.8 }] },
      status: "SUCCESS",
    },
  ],
};

describe("schema run creation UI", () => {
  let root: Root | null = null;

  beforeEach(() => {
    mountState.mount.mockReset();
    mountState.unmount.mockReset();
    mountState.updateTheme.mockReset();
    pageState.mutateAsync.mockReset();
    pageState.mutateAsync.mockResolvedValue({ id: "run-1" });
    pageState.version = version;
    mountState.mount.mockImplementation(() => ({
      form: {
        reports: [],
        state: { reportStates: {} },
        subscribe: () => () => {},
      },
      host: document.createElement("div"),
      unmount: mountState.unmount,
      updateTheme: mountState.updateTheme,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  test("updates mounted form theme without remounting resolved reports", async () => {
    const store = createStore();
    store.set(themeWithHtmlAtom, "light");
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <Provider store={store}>
          <SchemaRunForm version={version} onSubmit={vi.fn()} />
        </Provider>,
      );
      await flush();
    });
    expect(mountState.mount).toHaveBeenCalledTimes(1);
    mountState.updateTheme.mockClear();

    await act(async () => {
      store.set(themeWithHtmlAtom, "dark");
      await flush();
    });

    expect(mountState.mount).toHaveBeenCalledTimes(1);
    expect(mountState.unmount).not.toHaveBeenCalled();
    expect(mountState.updateTheme).toHaveBeenCalledWith("dark");
  });

  test("explains every disabled save state", () => {
    expect(getSchemaRunSaveAction("idle", false, false, true).label).toBe("Run inference first");
    expect(getSchemaRunSaveAction("running", false, false, true).label).toBe(
      "Running inference...",
    );
    expect(getSchemaRunSaveAction("unsaved", true, false, true).label).toBe(
      "Waiting for reports...",
    );
    expect(getSchemaRunSaveAction("unsaved", false, false, false).label).toBe(
      "Name inference first",
    );
    expect(getSchemaRunSaveAction("unsaved", false, true, true).label).toBe("Saving inference...");
    expect(getSchemaRunSaveAction("saved", false, false, true).label).toBe("Inference saved");
    expect(getSchemaRunSaveAction("unsaved", false, false, true)).toEqual({
      disabled: false,
      label: "Save inference",
      loading: false,
    });
  });

  test("enters running only after MLForm validation succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ reports: [] }))),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const actual = await vi.importActual<
      typeof import("@/capabilities/prediction-runtime/mlform/schema-run-mount")
    >("@/capabilities/prediction-runtime/mlform/schema-run-mount");
    const runningChanges: boolean[] = [];
    const mounted = actual.mountSchemaRunForm({
      container,
      schema: {
        fields: [
          {
            id: "age",
            label: "Age",
            kind: "number",
            displayKey: "age",
            mappedTo: "age",
            required: true,
          },
        ],
        reports: [],
      },
      bindings: [{ modelId: "model-1" }],
      theme: "light",
      onRunningChange: (running) => runningChanges.push(running),
    });

    await mounted.form.submit().catch(() => undefined);
    expect(runningChanges).toEqual([]);

    mounted.form.setValues({ age: 42 });
    container
      .querySelector("mlf-form")
      ?.shadowRoot?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();
    expect(runningChanges).toEqual([true, false]);
    mounted.unmount();
  });

  test("resets the run name per prediction and saves each result once", async () => {
    const store = createStore();
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T14:48:41.705Z"));
    await act(async () => {
      root?.render(
        <Provider store={store}>
          <MemoryRouter initialEntries={["/schemas/schema-1/bookmarks/bookmark-1/runs/create"]}>
            <Routes>
              <Route
                path="/schemas/:schemaId/bookmarks/:bookmarkId/runs/create"
                element={<CreateSchemaRunPage />}
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );
      await vi.runAllTimersAsync();
    });

    const name = document.body.querySelector<HTMLInputElement>('[aria-label="Inference name"]')!;
    const save = document.body.querySelector<HTMLButtonElement>("[data-schema-run-save]")!;
    expect(name.value).toBe("run-2026-08-24T14:48:41.705Z");
    expect(save.textContent).toContain("Run inference first");
    expect(save.disabled).toBe(true);

    const mountOptions = mountState.mount.mock.calls[0][0];
    vi.setSystemTime(new Date("2026-08-24T14:49:00.000Z"));
    await act(async () => mountOptions.onRunningChange(true));
    expect(name.value).toBe("run-2026-08-24T14:49:00.000Z");
    expect(save.textContent).toContain("Running inference...");

    await act(async () => {
      mountOptions.onSubmit({ age: 42 }, completedRaw, true);
      await vi.runAllTimersAsync();
    });
    expect(save.textContent).toContain("Waiting for reports...");
    expect(save.disabled).toBe(true);

    await act(async () => {
      mountOptions.onSubmit({ age: 42 }, completedRaw, false);
      await vi.runAllTimersAsync();
    });
    expect(save.textContent).toContain("Save inference");
    expect(save.disabled).toBe(false);

    pageState.mutateAsync.mockReset();
    pageState.mutateAsync.mockRejectedValueOnce(new Error("Prediction run name already exists"));
    await act(async () => {
      save.click();
      await vi.runAllTimersAsync();
    });
    expect(save.textContent).toContain("Save inference");
    expect(save.disabled).toBe(false);

    let resolveOldSave!: (value: { id: string }) => void;
    pageState.mutateAsync.mockReset();
    pageState.mutateAsync
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveOldSave = resolve as typeof resolveOldSave)),
      )
      .mockResolvedValueOnce({ id: "run-2" });
    await act(async () => {
      save.click();
      save.click();
      await Promise.resolve();
    });
    expect(pageState.mutateAsync).toHaveBeenCalledTimes(1);
    expect(save.textContent).toContain("Saving inference...");
    expect(save.disabled).toBe(true);

    vi.setSystemTime(new Date("2026-08-24T14:50:00.000Z"));
    await act(async () => {
      mountOptions.onRunningChange(true);
      mountOptions.onSubmit({ age: 43 }, completedRaw, false);
    });
    expect(name.value).toBe("run-2026-08-24T14:50:00.000Z");
    await act(async () => resolveOldSave({ id: "run-1" }));
    expect(save.textContent).toContain("Save inference");
    expect(save.disabled).toBe(false);

    await act(async () => {
      save.click();
      await vi.runAllTimersAsync();
    });
    expect(pageState.mutateAsync).toHaveBeenCalledTimes(2);
    expect(pageState.mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "run-2026-08-24T14:50:00.000Z" }),
    );
    expect(save.textContent).toContain("Inference saved");
  });
});
