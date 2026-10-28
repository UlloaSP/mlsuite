// @vitest-environment jsdom

import { expect, test } from "vite-plus/test";
import { ModelEnvironmentSection } from "@/features/models/components/ModelEnvironmentSection";
import { ModelOverviewTab } from "@/features/models/components/ModelOverviewTab";
import { readModelManifest } from "@/features/models/lib/model-manifest";
import type { RuntimeEnvironmentDto } from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

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

const legacy: RuntimeEnvironmentDto = {
  key: "env-legacy",
  legacy: true,
  pythonVersion: "3.14",
  writerVersion: "0.2.1",
  packages: [],
};

test("a locked environment lists its Python, mlbundle and packages", async () => {
  const { host } = await mount(<ModelEnvironmentSection environment={locked} />);

  expect(host.textContent).toContain("3.12.7");
  expect(host.textContent).toContain("0.3.0");
  expect(host.textContent).toContain("Locked by the bundle");
  expect(
    [...host.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")].map((cell) => cell.textContent),
    ),
  ).toEqual([
    ["numpy", "2.1.3"],
    ["scikit-learn", "1.5.2"],
  ]);
});

test("the legacy environment is named as such", async () => {
  const { host } = await mount(<ModelEnvironmentSection environment={legacy} />);

  expect(host.textContent).toContain("Legacy environment");
  expect(host.textContent).toContain("before mlbundle 0.3");
  expect(host.textContent).toContain("3.14");
  expect(host.querySelector("table")).toBeNull();
});

test.each([
  ["PREPARING", "appear once the model's environment is prepared"],
  ["FAILED", "appear once the model's environment is prepared"],
  ["READY", "No feature importances"],
] as const)("missing importances of a %s model are explained", async (runtimeState, text) => {
  const { host } = await mount(
    <ModelOverviewTab
      manifest={readModelManifest({})}
      outputs={[]}
      schemaSource={null}
      importances={null}
      runtimeState={runtimeState}
    />,
  );

  expect(host.textContent).toContain(text);
});
