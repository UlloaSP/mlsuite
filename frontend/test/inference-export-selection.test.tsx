// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { InferenceExportSelectionDialog } from "@/features/schemas/components/InferenceExportSelectionDialog";
import type { InferenceExportCandidate } from "@/features/schemas/components/OrganizationInferenceExportButton";
let root: Root;
let host: HTMLDivElement;
const proceed = vi.fn();
const retry = vi.fn();
const close = vi.fn();
const items: InferenceExportCandidate[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `Run ${i + 1}`,
  createdAt: "2026-09-10T10:00:00Z",
  schemaId: 5,
  schemaName: "Schema",
  schemaVersionId: i === 14 ? 8 : 7,
  schemaVersionName: i === 14 ? "Second" : "First",
  schemaVersion: i === 14 ? 2 : 1,
  bookmarkId: 10,
  bookmarkName: "Baseline",
}));
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});
async function render(busy = false, error = false, data = items) {
  await act(async () =>
    root.render(
      <InferenceExportSelectionDialog
        items={data}
        busy={busy}
        error={error}
        onClose={close}
        onContinue={proceed}
        onRetry={retry}
      />,
    ),
  );
}
function button(text: string) {
  const found = [...host.querySelectorAll("button")].find((x) => x.textContent?.trim() === text);
  expect(found).toBeDefined();
  return found!;
}
async function click(text: string) {
  await act(async () => button(text).click());
}
test("opens selection dialog with snapshot/bookmark and paginates before preparing", async () => {
  await render();
  expect(host.querySelector("dialog")?.open).toBe(true);
  expect(host.querySelector('[aria-label="Bookmark"]')).not.toBeNull();
  expect(host.textContent).toContain("14 of 14 selected");
  expect(proceed).not.toHaveBeenCalled();
  await click("Next");
  expect(host.textContent).toContain("Run 7");
  await click("Continue");
  expect(proceed).toHaveBeenCalledWith({
    versionId: "7",
    runIds: items.slice(0, 14).map((x) => String(x.id)),
  });
});
test("exports only explicitly selected inferences and disables empty selection", async () => {
  await render();
  await click("Clear");
  expect(button("Continue").disabled).toBe(true);
  const row = [...host.querySelectorAll("button")].find((x) => x.textContent?.includes("Run 1"))!;
  await act(async () => row.click());
  await click("Continue");
  expect(proceed).toHaveBeenCalledWith({ versionId: "7", runIds: ["1"] });
});
test("busy preparation locks selection but allows cancellation", async () => {
  await render(true);
  expect(host.querySelector("fieldset")?.disabled).toBe(true);
  expect(button("Preparing export...").disabled).toBe(true);
  await click("Cancel");
  expect(close).toHaveBeenCalledOnce();
});
test("preparation failure is visible and retryable", async () => {
  await render(false, true);
  expect(host.querySelector('[role="alert"]')?.textContent).toBe(
    "Could not prepare inference export.",
  );
  await click("Retry");
  expect(retry).toHaveBeenCalledOnce();
});
test("no candidates cannot advance", async () => {
  await render(false, false, []);
  expect(button("Continue").disabled).toBe(true);
});
