// @vitest-environment jsdom

import { act } from "react";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { CreateModelPage } from "@/features/models/pages/create-model-page";
import { changeValue, click, mount, type Mounted } from "./support/dom";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  inspect: vi.fn(),
  navigate: vi.fn(),
  error: vi.fn(),
}));
vi.mock("react-router", async (original) => ({
  ...(await original<typeof import("react-router")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: 1 } }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({ data: { permissions: { canCreateModels: true } } }),
}));
vi.mock("@/features/models/api/model.mutations", () => ({
  useCreateModelMutation: () => ({ mutateAsync: mocks.create }),
  useInspectArtifactMutation: () => ({ mutateAsync: mocks.inspect }),
}));

let view: Mounted;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.inspect.mockResolvedValue({ type: "classifier" });
  mocks.create.mockResolvedValue({});
  view = await mount(<CreateModelPage />, { route: "/" });
  container = view.host;
});

const upload = async (...names: string[]) => {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Upload bundle files"]',
  )!;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: names.map((name) => new File(["fixture"], name)),
  });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
};
const saveAll = () => click("Save all", container);
const blankFirstName = () =>
  changeValue(container.querySelector<HTMLInputElement>('input[aria-label^="Rename"]')!, "");

test("saves all valid models and returns to catalog", async () => {
  await upload("first.mlbundle", "second.mlbundle");
  await saveAll();
  expect(mocks.create).toHaveBeenCalledTimes(2);
  expect(mocks.navigate).toHaveBeenCalledWith("/models");
});
test("inspects a bundle before listing it and saves it under its name", async () => {
  await upload("risk.mlbundle");
  expect(mocks.inspect).toHaveBeenCalledWith(expect.objectContaining({ name: "risk.mlbundle" }));
  await saveAll();
  expect(mocks.create).toHaveBeenCalledWith({
    name: "Risk",
    modelFile: expect.objectContaining({ name: "risk.mlbundle" }),
  });
});
test("does not list a bundle the runtime rejects", async () => {
  mocks.inspect.mockRejectedValueOnce(new Error("Cannot load bundle"));
  await upload("broken.mlbundle");
  expect(container.textContent).toContain("No bundles yet");
});
test("retains a nameless bundle after saving the valid bundle", async () => {
  await upload("first.mlbundle", "second.mlbundle");
  await blankFirstName();
  await saveAll();
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(container.querySelector<HTMLInputElement>('input[aria-label^="Rename"]')?.value).toBe("");
});
test("retains other incomplete bundles after an individual save", async () => {
  await upload("first.mlbundle", "second.mlbundle");
  await blankFirstName();
  const save = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Save" && !button.disabled,
  )!;
  await click(save);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.navigate).not.toHaveBeenCalled();
});
test("stays on upload page when persistence fails", async () => {
  await upload("first.mlbundle");
  mocks.create.mockRejectedValueOnce(new Error("Save failed"));
  await saveAll();
  expect(mocks.navigate).not.toHaveBeenCalled();
});
test.each(["model.joblib", "model.onnx", "data.csv"])(
  "reports %s as unsupported without inspecting it",
  async (name) => {
    await upload(name);
    expect(mocks.inspect).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining(name));
    expect(container.textContent).toContain("No bundles yet");
  },
);
