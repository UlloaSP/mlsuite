// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SchemaDraftConflictPage } from "@/features/schemas/pages/schema-draft-conflict-page";
import { mount } from "./support/dom";

const data = vi.hoisted(() => ({ changes: [] as Array<Record<string, unknown>> }));
const loaded = (value: unknown) => ({
  data: value,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
});

vi.mock("@/features/schemas/api/schema-queries", () => ({
  useSchema: () => loaded({ id: 4, name: "Risk" }),
  useSchemaDraft: () =>
    loaded({
      id: 8,
      name: "Tweak labels",
      baseVersion: 1,
      baseVersionId: 11,
      formSchema: {},
      bindings: [],
      revision: 2,
    }),
  useSchemaDraftDiff: () =>
    loaded({
      baseVersionId: 11,
      currentVersionId: 11,
      currentDocumentHash: "h",
      hasConflicts: false,
      changes: data.changes,
    }),
  useSchemaVersion: () =>
    loaded({
      id: 11,
      version: 1,
      name: "v1",
      formSchema: {},
      bindings: [],
      createdAt: "2026-11-01T00:00:00Z",
    }),
}));
vi.mock("@/features/schemas/api/schema-draft-mutations", () => ({
  useMergeSchemaDraftMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePublishSchemaDraftMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock("@/features/schemas/components/SchemaMergeDiffViewer", () => ({
  SchemaMergeDiffViewer: () => <div data-testid="diff" />,
}));

const openPage = async () =>
  (
    await mount(null, {
      route: "/schemas/4/drafts/8/conflicts",
      routes: { "/schemas/$schemaId/drafts/$draftId/conflicts": <SchemaDraftConflictPage /> },
    })
  ).host;
const publishButton = (host: HTMLElement) =>
  [...host.querySelectorAll("button")].find((node) =>
    node.textContent?.includes("Publish snapshot"),
  );

describe("reviewing a schema change", () => {
  beforeEach(() => {
    data.changes = [];
  });

  test("a change that changes nothing says so and cannot be published", async () => {
    const host = await openPage();

    expect(host.textContent).toContain("No changes against v1");
    expect(host.querySelector('[data-testid="diff"]')).toBeNull();
    expect(publishButton(host)?.disabled).toBe(true);
  });

  test("a change with edits shows the diff and can be published", async () => {
    data.changes = [{ path: "/fields/0/label", draftChanged: true, conflict: false }];
    const host = await openPage();

    expect(host.textContent).not.toContain("No changes against");
    expect(host.querySelector('[data-testid="diff"]')).not.toBeNull();
    expect(publishButton(host)?.disabled).toBe(false);
  });
});
