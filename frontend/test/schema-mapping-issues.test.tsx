// @vitest-environment jsdom

import { act } from "react";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vite-plus/test";
import { HttpError } from "@/shared/api/http";
import { mappingIssueCards, refusedMappings } from "@/features/schemas/lib/schema-mapping-issues";
import { click, mount } from "./support/dom";

const formSchema = {
  fields: [{ kind: "number", label: "Age", mappedTo: { "risk-forest": "age" } }],
  reports: [{ kind: "classifier", label: "Risk", mappedTo: { "risk-forest": "risk" } }],
};
const ISSUE = {
  pointer: "/reports/0/mappedTo/risk-forest",
  message:
    'Report "Risk" reads output "risk", which model "risk-forest" does not have (its outputs: 0).',
};
const refusal = (issues: unknown) =>
  new HttpError({
    status: 400,
    timestamp: "2026-10-27T10:00:00Z",
    message: ISSUE.message,
    issues,
  } as never);

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  draft: {
    id: "12",
    schemaId: "7",
    name: "Fix risk",
    status: "DRAFT",
    formSchema: {} as Record<string, unknown>,
    bindings: [{ modelId: 3 }],
    revision: 1,
    baseVersion: 1,
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  useSchema: () => ({ data: { name: "Cardio risk" } }),
  useSchemaDraft: () => ({ data: mocks.draft }),
  useSchemaDraftDiff: () => ({ data: { changes: [] } }),
}));
vi.mock("@/features/schemas/api/schema-draft-mutations", () => ({
  useUpdateSchemaDraftMutation: () => ({ mutateAsync: mocks.update, isPending: false }),
}));
vi.mock("@/features/schemas/components/EditorBody", () => ({ EditorBody: () => null }));
vi.mock("@/features/schemas/components/SchemaFormPreview", () => ({
  SchemaFormPreview: () => null,
}));
vi.mock("@/features/schemas/components/SchemaChangeNameDialog", () => ({
  SchemaChangeNameDialog: () => null,
}));

import { SchemaDraftEditorPage } from "@/features/schemas/pages/schema-draft-editor-page";

const text = JSON.stringify(formSchema, null, 2);

test("a refused mapping is read from the server's answer, and nothing else is", () => {
  expect(refusedMappings(refusal([ISSUE]))).toEqual([ISSUE]);
  expect(refusedMappings(refusal(undefined))).toEqual([]);
  expect(refusedMappings(new Error("offline"))).toEqual([]);
});

test("a refused mapping is placed on the line of the mapping it names", () => {
  const [card] = mappingIssueCards(text, [ISSUE]);

  expect(text.split("\n")[card.line - 1]).toContain('"risk-forest": "risk"');
  expect(card).toMatchObject({ path: "reports.0.mappedTo.risk-forest", severity: "error" });
  expect(mappingIssueCards("{ not json", [ISSUE])[0]).toMatchObject({ line: 1, column: 1 });
});

test("saving a change the server refuses shows each refused mapping where it is, until a save succeeds", async () => {
  mocks.draft = { ...mocks.draft, formSchema };
  mocks.update.mockRejectedValueOnce(refusal([ISSUE]));
  const { host } = await openEditor();
  expect(host.textContent).toContain("Valid");

  await save();
  expect(host.textContent).toContain("1 Error");
  expect(buttonNamed(host, "Review changes")?.disabled).toBe(true);
  await click("1 Error");
  expect(host.textContent).toContain(ISSUE.message);
  expect(host.textContent).toContain("reports.0.mappedTo.risk-forest");

  mocks.update.mockResolvedValueOnce(mocks.draft);
  await save();
  expect(host.textContent).toContain("Valid");
  expect(host.textContent).not.toContain(ISSUE.message);
});

test("a save refused for another reason shows no mapping error", async () => {
  mocks.draft = { ...mocks.draft, formSchema };
  mocks.update.mockRejectedValueOnce(new Error("Draft changed"));
  const { host } = await openEditor();

  await save();

  expect(host.textContent).toContain("Valid");
  expect(mocks.update).toHaveBeenCalled();
});

const openEditor = () =>
  mount(
    <Routes>
      <Route path="/schemas/:schemaId/drafts/:draftId" element={<SchemaDraftEditorPage />} />
    </Routes>,
    { route: "/schemas/7/drafts/12" },
  );

/** Saves, and lets the save's answer settle. */
async function save() {
  await click("Save");
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

const buttonNamed = (host: HTMLElement, name: string) =>
  [...host.querySelectorAll("button")].find((button) => button.textContent?.trim() === name);
