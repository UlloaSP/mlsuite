// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { BookmarkPredictPanel } from "@/features/schemas/components/BookmarkPredictPanel";
import { binding, schemaVersion } from "./support/api-fixtures";
import { changeValue, click, mount } from "./support/dom";
import type { SessionEntry } from "@/features/schemas/lib/use-inference-session";

const snapshots = vi.hoisted(() => ({ earlier: undefined as unknown, isError: false }));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  usePredictionRun: () => ({ data: undefined }),
  useSchemaVersion: (id: number | undefined) => ({
    data: id === 22 ? snapshots.earlier : undefined,
    isError: snapshots.isError,
  }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 1,
}));
vi.mock("@/capabilities/prediction-runtime/plugins/schema-plugin-catalog", () => ({
  useSchemaPluginCatalog: () => ({ data: { fieldDefinitions: [], reportDefinitions: [] } }),
}));
vi.mock("@/features/schemas/components/SchemaRunForm", () => ({
  SchemaRunForm: () => <input aria-label="Live form input" defaultValue="keep me" />,
}));
vi.mock("@/features/schemas/components/SchemaRunReportsPanel", () => ({
  SchemaRunReportsPanel: ({ results }: { results: SessionEntry["results"] }) => (
    <p>Report for {String(results[0]?.modelInput["0"])}</p>
  ),
}));

const version = schemaVersion({
  id: 23,
  formSchema: {
    fields: [
      { id: "age", label: "Patient age", displayKey: "patientAge", kind: "number", mappedTo: 0 },
    ],
    reports: [],
  },
  bindings: [binding(1)],
});
const entry = (key: string, age: number, versionId = 23): SessionEntry => ({
  key,
  schemaVersionId: versionId,
  name: `Case ${key}`,
  state: "ready",
  inputData: {},
  results: [{ modelId: 1, modelInput: { "0": age }, output: {}, status: "SUCCESS" }],
  reportsPending: false,
  createdAt: "2026-09-30T10:00:00Z",
});
const renderPreview = (
  entries = [entry("first", 42), entry("second", 55)],
  liveKey: string | null = "second",
) =>
  mount(
    <BookmarkPredictPanel
      version={version}
      session={{
        entries,
        liveKey,
        unsavedCount: entries.length,
        onRunningChange: vi.fn(),
        onResult: vi.fn(),
        addResult: vi.fn(),
        detachForm: vi.fn(),
        save: vi.fn(),
        saveAll: vi.fn(),
        rename: vi.fn(),
        remove: vi.fn(),
        discardAll: vi.fn(),
      }}
    />,
  );
const select = async (host: HTMLElement, index: number) =>
  click(host.querySelectorAll("aside button[aria-pressed]")[index]);

describe("inference session preview", () => {
  beforeEach(() => {
    snapshots.earlier = undefined;
    snapshots.isError = false;
  });
  test("shows reports first and collapsible inputs below for the latest run", async () => {
    const { host } = await renderPreview();
    await select(host, 1);
    const details = host.querySelector("details")!;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")?.textContent).toBe("Inputs");
    expect(host.textContent).toContain("Report for 55");
    expect(host.textContent!.indexOf("Report for 55")).toBeLessThan(
      host.textContent!.indexOf("Inputs"),
    );
    await click(details.querySelector("summary")!);
    expect(details.open).toBe(true);
    expect(details.textContent).toContain("Patient age");
    expect(details.textContent).toContain("55");
  });

  test("switching entries displays their own inputs and resets the collapsed section", async () => {
    const { host } = await renderPreview();
    await select(host, 0);
    await click(host.querySelector("summary")!);
    await changeValue(
      host.querySelector<HTMLInputElement>('input[aria-label="Search inputs"]')!,
      "nothing",
    );
    await select(host, 1);
    expect(host.querySelector("details")!.open).toBe(false);
    expect(host.querySelector("details")!.textContent).toContain("55");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Search inputs"]')!.value).toBe(
      "",
    );
  });

  test("previewing a run keeps the live form mounted and its inputs intact", async () => {
    const { host } = await renderPreview();
    const liveInput = host.querySelector<HTMLInputElement>('input[aria-label="Live form input"]')!;
    await changeValue(liveInput, "unsent input");
    await select(host, 0);
    await click("Back to form", host);
    expect(host.querySelector('input[aria-label="Live form input"]')).toBe(liveInput);
    expect(liveInput.value).toBe("unsent input");
  });

  test("uses the stored run's snapshot when it differs from the current form", async () => {
    snapshots.earlier = schemaVersion({
      ...version,
      id: 22,
      formSchema: {
        fields: [{ id: "height", label: "Patient height", kind: "number", mappedTo: 0 }],
        reports: [],
      },
    });
    const { host } = await renderPreview([entry("old", 180, 22)], null);
    await select(host, 0);
    expect(host.querySelector("details")!.textContent).toContain("Patient height");
    expect(host.querySelector("details")!.textContent).not.toContain("Patient age");
  });

  test.each([false, true])(
    "waits for the captured snapshot without displaying current-schema inputs (error: %s)",
    async (isError) => {
      snapshots.isError = isError;
      const { host } = await renderPreview([entry("old", 180, 22)], null);
      await select(host, 0);
      expect(host.querySelector("details")).toBeNull();
      expect(host.textContent).toContain(
        isError
          ? "Could not load this inference's schema snapshot."
          : "Loading inference snapshot…",
      );
    },
  );
});
