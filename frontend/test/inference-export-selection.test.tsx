// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vite-plus/test";
import { InferenceExportSelectionDialog } from "@/features/schemas/components/InferenceExportSelectionDialog";
import type { InferenceExportCandidate } from "@/features/schemas/components/OrganizationInferenceExportButton";
import { buttonByText, click, mount } from "./support/dom";
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
afterEach(() => {
  vi.clearAllMocks();
});
async function render(busy = false, error = false, data = items) {
  await mount(
    <InferenceExportSelectionDialog
      items={data}
      busy={busy}
      error={error}
      onClose={close}
      onContinue={proceed}
      onRetry={retry}
    />,
  );
}
test("opens selection dialog with snapshot/bookmark and paginates before preparing", async () => {
  await render();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(document.body.querySelector('[aria-label="Bookmark"]')).not.toBeNull();
  expect(document.body.textContent).toContain("14 of 14 selected");
  expect(proceed).not.toHaveBeenCalled();
  await click("Next");
  expect(document.body.textContent).toContain("Run 7");
  await click("Continue");
  expect(proceed).toHaveBeenCalledWith({
    versionId: "7",
    runIds: items.slice(0, 14).map((x) => String(x.id)),
  });
});
test("exports only explicitly selected inferences and disables empty selection", async () => {
  await render();
  await click("Clear");
  expect(buttonByText("Continue")?.disabled).toBe(true);
  const row = [...document.body.querySelectorAll("button")].find((x) =>
    x.textContent?.includes("Run 1"),
  )!;
  await click(row);
  await click("Continue");
  expect(proceed).toHaveBeenCalledWith({ versionId: "7", runIds: ["1"] });
});
test("busy preparation locks selection but allows cancellation", async () => {
  await render(true);
  expect(document.body.querySelector("fieldset")?.disabled).toBe(true);
  expect(buttonByText("Preparing export…")?.disabled).toBe(true);
  await click("Cancel");
  expect(close).toHaveBeenCalledOnce();
});
test("preparation failure is visible and retryable", async () => {
  await render(false, true);
  expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(
    "Could not prepare inference export.",
  );
  await click("Retry");
  expect(retry).toHaveBeenCalledOnce();
});
test("no candidates cannot advance", async () => {
  await render(false, false, []);
  expect(buttonByText("Continue")?.disabled).toBe(true);
});
