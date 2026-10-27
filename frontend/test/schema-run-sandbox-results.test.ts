/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import type { openPluginSandbox } from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox";
import { mountSandboxedSchemaRunForm } from "@/capabilities/prediction-runtime/sandbox/sandboxed-forms";

type SandboxOptions = Parameters<typeof openPluginSandbox>[0];
const sandbox = vi.hoisted(() => ({ options: null as unknown }));
vi.mock("@/capabilities/prediction-runtime/sandbox/plugin-sandbox", () => ({
  openPluginSandbox: (options: unknown) => {
    sandbox.options = options;
    return {
      mount: async () => {},
      destroy: () => {},
      request: async () => {},
      setSizing: () => {},
    };
  },
}));

const options = () => sandbox.options as SandboxOptions;
const sealed = (age: number) => ({
  modelId: 1,
  modelInput: { age },
  output: { reports: [] },
  status: "SUCCESS",
  errorMessage: null,
  errorJson: null,
  attestation: `seal-${age}`,
});

/** The form in the sandbox submits these values; the app runs them and hands back its answer. */
const submit = async (age: number) => {
  const handlers = options().handlers as Record<
    string,
    (params: unknown) => Promise<{ raw: Record<string, unknown> }>
  >;
  return handlers.submit!({
    request: { inputs: [], displayValues: { age }, modelValues: { age }, reports: [] },
    fields: [{ id: "age", mappedTo: "age" }],
  });
};
const emit = (name: "run-settled" | "run-updated", raw: Record<string, unknown>, inputData = {}) =>
  options().onEvent!({ name, payload: { inputData, raw, reportsPending: false } } as never);

describe("a workspace run keeps the app's own results, whatever the sandbox reports", () => {
  const onSubmit = vi.fn();
  const onResultUpdate = vi.fn();
  beforeEach(() => {
    onSubmit.mockReset();
    onResultUpdate.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const { modelInput } = JSON.parse(init.body as string) as { modelInput: { age: number } };
        return new Response(JSON.stringify(sealed(modelInput.age)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    mountSandboxedSchemaRunForm({
      container: document.createElement("div"),
      target: { bookmarkId: 7, schemaVersionId: 3 },
      schema: {},
      plugins: { fields: [], reports: [] },
      bindings: [{ modelId: 1, modelName: "forest", pluginPolicy: null }],
      onSubmit,
      onResultUpdate,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  test("a run settles with the values and sealed results the app received", async () => {
    const answer = await submit(42);

    emit(
      "run-settled",
      { ...answer.raw, results: [{ ...sealed(42), attestation: "forged" }] },
      { age: 99 },
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [inputData, raw] = onSubmit.mock.calls[0]!;
    expect(inputData).toEqual({ age: 42 });
    expect(
      (raw as { results: { attestation: string }[] }).results.map((result) => result.attestation),
    ).toEqual(["seal-42"]);
  });

  test("an answer naming no submission the app made is ignored", async () => {
    const answer = await submit(42);

    emit("run-settled", { ...answer.raw, mlsuiteSubmission: 99 });
    emit("run-settled", { results: [sealed(42)] });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("an earlier run cannot settle once a later one was answered, so seals never swap", async () => {
    const first = await submit(42);
    const second = await submit(55);

    emit("run-settled", first.raw);
    expect(onSubmit).not.toHaveBeenCalled();

    emit("run-settled", second.raw);
    expect(onSubmit.mock.calls[0]![0]).toEqual({ age: 55 });
  });

  test("a later update of the run's reports keeps the same results", async () => {
    const answer = await submit(42);

    emit("run-updated", { ...answer.raw, results: [] });

    expect(onResultUpdate).toHaveBeenCalledTimes(1);
    expect((onResultUpdate.mock.calls[0]![1] as { results: unknown[] }).results).toHaveLength(1);
  });
});
