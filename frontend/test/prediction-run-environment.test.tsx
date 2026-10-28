// @vitest-environment jsdom

import { act } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { PredictionRunEnvironments } from "@/features/schemas/components/PredictionRunEnvironments";
import type { RuntimeEnvironmentDto } from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

const mocks = vi.hoisted(() => ({
  appFetch: vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>(),
}));
vi.mock("@/shared/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/http")>()),
  appFetch: (path: string, init?: RequestInit) => mocks.appFetch(path, init),
}));

const locked: RuntimeEnvironmentDto = {
  key: "env-locked",
  legacy: false,
  pythonVersion: "3.12.7",
  writerVersion: "0.3.0",
  packages: [
    { name: "numpy", version: "2.1.3" },
    { name: "scikit-learn", version: "1.5.2" },
  ],
};

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

afterEach(() => {
  mocks.appFetch.mockReset();
});

test("each inference result names the environment that computed it", async () => {
  mocks.appFetch.mockResolvedValue(locked);
  const { host } = await mount(
    <PredictionRunEnvironments
      results={[
        { id: 1, modelId: 12, environmentKey: "env-locked" },
        { id: 2, modelId: 13, environmentKey: null },
      ]}
      bindings={[
        { modelId: 12, modelName: "Risk" },
        { modelId: 13, modelName: "Churn" },
      ]}
    />,
  );
  await settle();

  expect(mocks.appFetch).toHaveBeenCalledWith(
    "/api/runtime-environments/env-locked",
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect([...host.querySelectorAll("li")].map((item) => item.textContent)).toEqual([
    "Risk ran in Python 3.12.7 · mlbundle 0.3.0 · scikit-learn 1.5.2",
  ]);
});

test("results stored before environments show no environment", async () => {
  const { host } = await mount(
    <PredictionRunEnvironments
      results={[{ id: 1, modelId: 12, environmentKey: null }]}
      bindings={[{ modelId: 12, modelName: "Risk" }]}
    />,
  );

  expect(host.textContent).toBe("");
  expect(mocks.appFetch).not.toHaveBeenCalled();
});
