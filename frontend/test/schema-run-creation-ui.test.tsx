/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { Provider, createStore } from "jotai";
import { act } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { SchemaRunForm } from "@/features/schemas/components/SchemaRunForm";
import { BookmarkPredictPanel } from "@/features/schemas/components/BookmarkPredictPanel";
import { useInferenceSession } from "@/features/schemas/lib/use-inference-session";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { buttonByText, changeValue, click, mount } from "./support/dom";

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

const sessionUser = vi.hoisted(() => ({ id: "user-1" }));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: sessionUser.id } }),
}));
vi.mock("@/capabilities/prediction-runtime/mlform/schema-run-mount", () => ({
  mountSchemaRunForm: mountState.mount,
}));

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 1,
}));
vi.mock("@/capabilities/prediction-runtime/plugins/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => catalogState,
}));

vi.mock("@/features/schemas/api/schema-queries", () => ({
  usePredictionRun: () => ({ data: undefined }),
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
    vi.clearAllMocks();
  });

  test("updates mounted form theme without remounting resolved reports", async () => {
    const store = createStore();
    store.set(themeWithHtmlAtom, "light");
    await mount(
      <Provider store={store}>
        <SchemaRunForm version={version} onSubmit={vi.fn()} />
      </Provider>,
    );
    await act(flush);
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
      .querySelector("mlf-kit-tabs")
      ?.shadowRoot?.querySelector<HTMLButtonElement>(".btn-submit")
      ?.click();
    await flush();
    await flush();
    expect(runningChanges).toEqual([true, false]);
    mounted.unmount();
  });

  test("keeps each run in the session until it is saved or removed", async () => {
    const container = await renderSession();
    const options = () => mountState.mount.mock.calls[0][0];
    const rows = () => [...container.querySelectorAll("aside li")];
    expect(container.textContent).toContain("Each run appears here");

    vi.setSystemTime(new Date("2026-08-24T14:49:00.000Z"));
    await act(async () => options().onRunningChange(true));
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain("Running…");
    expect(nameInputs()[0].value).toBe("run-2026-08-24T14:49:00.000Z");

    await act(async () => {
      options().onRunningChange(false);
      options().onSubmit({ age: 42 }, completedRaw, true);
      await vi.runAllTimersAsync();
    });
    expect(rows()[0].textContent).toContain("Reports pending");
    expect(saveButton(rows()[0]).disabled).toBe(true);

    await act(async () => {
      // Reports finished resolving.
      options().onSubmit({ age: 42 }, completedRaw, false);
      await vi.runAllTimersAsync();
    });
    expect(rows()[0].textContent).toContain("Success");
    expect(saveButton(rows()[0]).disabled).toBe(false);

    await changeValue(nameInputs()[0], "Reviewed case");
    pageState.mutateAsync.mockRejectedValueOnce(new Error("Prediction run name already exists"));
    await act(async () => {
      saveButton(rows()[0]).click();
      await vi.runAllTimersAsync();
    });
    expect(rows()[0].textContent).not.toContain("Saved");
    await act(async () => {
      saveButton(rows()[0]).click();
      await vi.runAllTimersAsync();
    });
    expect(pageState.mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "Reviewed case", schemaVersionId: "version-1" }),
    );
    expect(rows()[0].textContent).toContain("Saved");
    expect(rows()[0].querySelector("a")?.getAttribute("href")).toBe("/inferences/run-1");
    expect(nameInputs()[0].disabled).toBe(true);

    // A run that stops without a result leaves nothing behind.
    await act(async () => {
      options().onRunningChange(true);
      options().onRunningChange(false);
      await vi.runAllTimersAsync();
    });
    expect(rows()).toHaveLength(1);

    await click(removeButton(rows()[0]));
    expect(rows()).toHaveLength(0);
  });

  test("saves every finished run in order, and asks before discarding unsaved ones", async () => {
    const container = await renderSession();
    const options = () => mountState.mount.mock.calls[0][0];
    for (const age of [1, 2]) {
      vi.setSystemTime(new Date(`2026-08-24T14:5${age}:00.000Z`));
      await act(async () => {
        options().onRunningChange(true);
        options().onRunningChange(false);
        options().onSubmit({ age }, completedRaw, false);
        await vi.runAllTimersAsync();
      });
    }
    await act(async () => {
      buttonByText("Save all (2)", container)!.click();
      await vi.runAllTimersAsync();
    });
    expect(pageState.mutateAsync.mock.calls.map(([request]) => request.name)).toEqual([
      "run-2026-08-24T14:51:00.000Z",
      "run-2026-08-24T14:52:00.000Z",
    ]);
    expect(container.textContent).toContain("All saved");

    await act(async () => {
      options().onRunningChange(true);
      options().onRunningChange(false);
      options().onSubmit({ age: 3 }, completedRaw, false);
      await vi.runAllTimersAsync();
    });
    await click("Discard all", container);
    expect(document.body.textContent).toContain("1 unsaved inference is lost");
    await act(async () => {
      buttonByText("Discard all", document.querySelector("[role=dialog]")!)!.click();
      await vi.runAllTimersAsync();
    });
    expect(container.querySelectorAll("aside li")).toHaveLength(0);
  });
  test("the session outlives the page; a run still going when it closes is dropped", async () => {
    vi.useFakeTimers();
    const store = createStore();
    const { host: container, root: sessionRoot } = await mount(null);
    const show = (visible: boolean) =>
      act(async () => {
        sessionRoot.render(
          <Provider store={store}>{visible ? <SessionHarness /> : null}</Provider>,
        );
        await vi.runAllTimersAsync();
      });
    await show(true);
    const options = () => mountState.mount.mock.calls.at(-1)![0];
    await act(async () => {
      options().onRunningChange(true);
      options().onRunningChange(false);
      options().onSubmit({ age: 1 }, completedRaw, false);
      options().onRunningChange(true);
      await vi.runAllTimersAsync();
    });
    expect(container.querySelectorAll("aside li")).toHaveLength(2);

    await show(false);
    await show(true);
    const rows = container.querySelectorAll("aside li");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Success");
    expect(container.textContent).toContain("1 unsaved");
  });

  test("another member signing in on the page never sees the previous member's runs", async () => {
    vi.useFakeTimers();
    const store = createStore();
    const { host: container, root: sessionRoot } = await mount(null);
    const show = () =>
      act(async () => {
        sessionRoot.render(
          <Provider store={store}>
            <SessionHarness />
          </Provider>,
        );
        await vi.runAllTimersAsync();
      });
    sessionUser.id = "user-1";
    await show();
    const options = () => mountState.mount.mock.calls.at(-1)![0];
    await act(async () => {
      options().onRunningChange(true);
      options().onRunningChange(false);
      options().onSubmit({ age: 1 }, completedRaw, false);
      await vi.runAllTimersAsync();
    });
    expect(container.querySelectorAll("aside li")).toHaveLength(1);

    sessionUser.id = "user-2";
    await show();
    expect(container.querySelectorAll("aside li")).toHaveLength(0);
    sessionUser.id = "user-1";
    await show();
    expect(container.querySelectorAll("aside li")).toHaveLength(1);
  });
});

function SessionHarness() {
  const session = useInferenceSession("bookmark-1", version.id);
  return (
    <MemoryRouter>
      <BookmarkPredictPanel version={version} session={session} />
    </MemoryRouter>
  );
}

async function renderSession() {
  vi.useFakeTimers();
  const { host } = await mount(
    <Provider store={createStore()}>
      <SessionHarness />
    </Provider>,
  );
  void act(() => vi.runOnlyPendingTimers());
  return host;
}

const nameInputs = () => [
  ...document.body.querySelectorAll<HTMLInputElement>('aside [aria-label="Inference name"]'),
];

const saveButton = (row: Element) =>
  [...row.querySelectorAll("button")].find((button) => button.textContent === "Save")!;

const removeButton = (row: Element) =>
  row.querySelector<HTMLButtonElement>('button[aria-label^="Remove"]')!;
