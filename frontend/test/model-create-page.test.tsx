// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { CreateModelPage } from "@/features/models/pages/create-model-page";
import { ModelActionsMenu } from "@/features/models/components/ModelActionsMenu";

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
  useMatchArtifactsMutation: () => ({ mutateAsync: vi.fn() }),
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.inspect.mockResolvedValue({ kind: "model" });
  mocks.create.mockResolvedValue({});
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <MemoryRouter>
        <CreateModelPage />
      </MemoryRouter>,
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
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
const saveAll = async () => {
  const button = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Save All",
  )!;
  await act(async () => button.click());
};
const blankFirstName = async () => {
  const input = container.querySelector<HTMLInputElement>('input[aria-label^="Rename"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

test("saves all valid models and returns to catalog", async () => {
  await upload("first.joblib", "second.joblib");
  await saveAll();
  expect(mocks.create).toHaveBeenCalledTimes(2);
  expect(mocks.navigate).toHaveBeenCalledWith("/models");
});
test("retains a nameless bundle after saving the valid bundle", async () => {
  await upload("first.joblib", "second.joblib");
  await blankFirstName();
  await saveAll();
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(container.querySelector<HTMLInputElement>('input[aria-label^="Rename"]')?.value).toBe("");
});
test("retains other incomplete bundles after an individual save", async () => {
  await upload("first.joblib", "second.joblib");
  await blankFirstName();
  const save = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Save" && !button.disabled,
  )!;
  await act(async () => save.click());
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.navigate).not.toHaveBeenCalled();
});
test("stays on upload page when persistence fails", async () => {
  await upload("first.joblib");
  mocks.create.mockRejectedValueOnce(new Error("Save failed"));
  await saveAll();
  expect(mocks.navigate).not.toHaveBeenCalled();
});
test("reports unsupported extensions without inspecting or creating bundles", async () => {
  await upload("unsupported.csv");
  expect(mocks.inspect).not.toHaveBeenCalled();
  expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("unsupported.csv"));
  expect(container.textContent).toContain("No bundles yet");
});
test.each([false, true])("only offers archive for active models, archived=%s", async (archived) => {
  await act(async () =>
    root.render(
      <ModelActionsMenu archived={archived} canEdit canDelete modelName="QA" onAction={vi.fn()} />,
    ),
  );
  await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
  expect(container.textContent?.includes("Archive")).toBe(!archived);
  expect(container.textContent).toContain("Delete");
});
