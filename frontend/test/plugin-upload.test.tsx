// @vitest-environment jsdom
import { act } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { UploadPluginPage } from "@/features/plugins/pages/UploadPluginPage";
import { inspectPluginFile } from "@/features/plugins/lib/plugin-upload-queue";
import { buttonByText, mount } from "./support/dom";

const mocks = vi.hoisted(() => ({
  detect: vi.fn<(organizationId: number | string, source: string) => Promise<unknown>>(),
  upload: vi.fn<(file: File) => Promise<unknown>>(),
}));
vi.mock("@/capabilities/prediction-runtime/plugins/plugin-catalog-loader", () => ({
  detectPluginType: (organizationId: number | string, source: string) =>
    mocks.detect(organizationId, source),
}));
vi.mock("@/features/plugins/api/plugin.mutations", () => ({
  useUploadPluginMutation: () => ({ mutateAsync: mocks.upload }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({ data: { currentOrganization: { id: 7 } } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const file = (name: string, source = "export default {}") => new File([source], name);

beforeEach(() => {
  mocks.detect.mockImplementation(async (_, source) => {
    if (source.includes("broken")) throw new Error("Plugin validation failed for field: no kind");
    return { pluginType: source.includes("report") ? "report" : "field", kind: "rating" };
  });
});

test("only a .ts file the runtime accepts becomes uploadable", async () => {
  await expect(inspectPluginFile(7, file("notes.txt"))).resolves.toEqual({
    status: "invalid",
    error: "Only .ts plugin files are supported.",
  });
  await expect(inspectPluginFile(7, file("rating.ts"))).resolves.toEqual({
    status: "ready",
    pluginType: "field",
    kind: "rating",
  });
  await expect(inspectPluginFile(7, file("bad.ts", "broken"))).resolves.toEqual({
    status: "invalid",
    error: "Plugin validation failed for field: no kind",
  });
  expect(mocks.detect).toHaveBeenCalledWith(7, "export default {}");
});

let container: HTMLDivElement;
afterEach(() => {
  mocks.detect.mockReset();
  mocks.upload.mockReset();
});

async function mountPage() {
  ({ host: container } = await mount(
    <Routes>
      <Route path="/plugins/upload" element={<UploadPluginPage />} />
      <Route path="/plugins" element={<p>Plugin catalog</p>} />
    </Routes>,
    { route: "/plugins/upload" },
  ));
}

async function addFiles(...files: File[]) {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Upload plugin files"]',
  )!;
  Object.defineProperty(input, "files", { configurable: true, value: files });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

const uploadAllButton = () => buttonByText("Upload all", container)!;

async function uploadAll() {
  await act(async () => {
    uploadAllButton().click();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

test("uploads the valid files one at a time and returns to the catalog", async () => {
  mocks.upload.mockResolvedValue({});
  await mountPage();
  expect(uploadAllButton().disabled).toBe(true);

  await addFiles(file("rating.ts"), file("chart.ts", "report"));
  expect(container.textContent).toContain("Ready");
  expect(container.textContent).toContain("Report");

  await uploadAll();
  expect(mocks.upload.mock.calls.map(([uploaded]) => uploaded.name)).toEqual([
    "rating.ts",
    "chart.ts",
  ]);
  expect(container.textContent).toBe("Plugin catalog");
});

test("keeps invalid and failed files on screen with their reason", async () => {
  mocks.upload.mockRejectedValueOnce(new Error("Storage unavailable"));
  await mountPage();

  await addFiles(file("broken.ts", "broken"), file("rating.ts"), file("readme.md"));
  expect(container.textContent).toContain("Plugin validation failed for field: no kind");
  expect(container.textContent).toContain("Only .ts plugin files are supported.");

  await uploadAll();
  expect(mocks.upload).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("Upload failed");
  expect(container.textContent).toContain("Storage unavailable");

  mocks.upload.mockResolvedValueOnce({});
  await uploadAll();
  expect(mocks.upload).toHaveBeenCalledTimes(2);
  expect(container.textContent).toContain("Uploaded");
  // Invalid files are still listed, so the page stays open.
  expect(container.textContent).not.toContain("Plugin catalog");
});
