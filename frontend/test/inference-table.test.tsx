// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { act, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { useSaveSchemaReviewFeedbackMutation } from "@/features/reviews/api/review-mutations";
import { useDeleteInferenceReviewResponseMutation } from "@/features/inferences/api/inference-mutations";
import { INFERENCES_QUERY_KEY } from "@/features/inferences/api/inference-api";
import * as reviewApi from "@/features/reviews/api/review-api";
import * as http from "@/shared/api/http";
import { InferenceTable } from "@/features/inferences/components/InferenceTable";
import { InferenceColumnsMenu } from "@/features/inferences/components/InferenceColumnsMenu";
import {
  InferenceFiltersDialog,
  type InferenceFilterChoice,
} from "@/features/inferences/components/InferenceFiltersDialog";
import {
  parseConditions,
  serializeConditions,
} from "@/features/inferences/lib/inference-conditions";
import type {
  InferenceTableRow,
  InferenceDataColumn,
} from "@/features/inferences/lib/inference-table-rows";
import {
  parseInferenceSort,
  useInferenceTable,
} from "@/features/inferences/lib/use-inference-table";
import type {
  InferenceTableDto,
  PredictionResultFeedbackDto,
  PredictionRunCatalogItemDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";
import { click, mount } from "./support/dom";

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 42,
}));

const summary = (id: number, overrides: Partial<PredictionRunCatalogItemDto> = {}) => ({
  id,
  name: `Case ${id}`,
  status: "SUCCESS" as const,
  origin: "WORKSPACE" as const,
  createdAt: `2026-07-2${id}T08:00:00Z`,
  updatedAt: `2026-07-2${id}T08:00:00Z`,
  schemaId: 2,
  schemaName: "Risk",
  schemaVersionId: 7,
  schemaVersion: 2,
  schemaVersionName: null,
  bookmarkId: 5,
  bookmarkName: "Stable",
  createdByName: "Ada Lovelace",
  createdByEmail: "ada@example.com",
  ...overrides,
});

const version = (id: number, fields: object[], reports?: object[]): SchemaVersionDto => ({
  id,
  schemaId: 2,
  version: id,
  name: null,
  createdAt: "2026-07-20T08:00:00Z",
  bindings: [{ id: 1, modelId: 1, schemaVersionId: id, pluginPolicy: null } as never],
  formSchema: {
    fields,
    reports: reports ?? [
      { kind: "classifier", label: "Score", mappedTo: { 1: "score" }, labels: ["No", "Yes"] },
    ],
  },
});

const result = (runId: number, prediction = 1) => ({
  id: runId * 10,
  runId,
  modelId: 1,
  modelInput: {},
  output: { reports: [{ mappedTo: "score", prediction }] },
  status: "SUCCESS" as const,
  errorMessage: null,
  errorJson: null,
  createdAt: "2026-07-20T08:00:00Z",
});

const answer = (runId: number, value: string): PredictionResultFeedbackDto => ({
  id: runId,
  resultId: runId * 10,
  userId: 1,
  userName: "Grace",
  userEmail: "grace@example.com",
  type: "OUTPUT",
  order: 0,
  value: { "output-feedback-assessment": value },
  createdAt: "2026-07-20T08:00:00Z",
  updatedAt: "2026-07-20T08:00:00Z",
});

const AGE = { id: "age", displayKey: "age", kind: "number", label: "Age" };

const payload = (overrides: Partial<InferenceTableDto> = {}): InferenceTableDto => ({
  runs: [
    { summary: summary(2), inputData: { age: 52, income: 900 } },
    { summary: summary(1, { schemaVersionId: 6, schemaVersion: 1 }), inputData: { age: 31 } },
  ],
  results: [result(2), result(1, 0)],
  feedback: [answer(2, "Yes")],
  versions: [
    version(7, [
      { ...AGE, label: "Age (years)" },
      { id: "income", displayKey: "income", kind: "number", label: "Income" },
    ]),
    version(6, [AGE]),
  ],
  ...overrides,
});

const serverColumns: InferenceDataColumn[] = [
  { id: "2:input:age", group: "inputs", label: "Age (years)", schemaId: 2, schemaName: "Risk" },
  { id: "2:input:income", group: "inputs", label: "Income", schemaId: 2, schemaName: "Risk" },
  { id: "2:output:1:score", group: "outputs", label: "Score", schemaId: 2, schemaName: "Risk" },
  {
    id: "2:7:feedback:OUTPUT:0:output-feedback-assessment:1",
    group: "feedback",
    label: "Assessment",
    schemaId: 2,
    schemaName: "Risk",
  },
];
const serverRows: InferenceTableRow[] = [
  {
    item: summary(2),
    feedbackStatus: "COMPLETED",
    values: new Map<string, unknown>([
      ["2:input:age", 52],
      ["2:input:income", 900],
      ["2:output:1:score", "Yes"],
    ]),
  },
  {
    item: summary(1),
    feedbackStatus: "PENDING",
    values: new Map<string, unknown>([
      ["2:input:age", 31],
      ["2:output:1:score", "No"],
    ]),
  },
];
vi.mock("@/features/inferences/api/inference-catalog", () => ({
  useInferenceFacetCatalog: (kind: string) => ({
    data: {
      items:
        kind === "schemas"
          ? [{ value: "2", label: "Risk" }]
          : kind === "columns"
            ? serverColumns.map((column) => ({ value: column.id, label: column.label }))
            : [],
    },
  }),
  useInferenceCatalogMetadata: () => ({
    data: {
      columns: serverColumns.map((column) => ({
        ...column,
        kind: column.id.endsWith("age") ? "number" : "text",
        choices: [],
      })),
      schemas: [{ value: "2", label: "Risk" }],
      bookmarks: [],
    },
    isSuccess: true,
    isPlaceholderData: false,
    isError: false,
  }),
}));
test("conditions and sorting keep stable column identities in URLs", () => {
  const conditions = [{ columnId: "2:input:a.b", operator: "gt" as const, value: "40" }];
  expect(parseConditions(serializeConditions(conditions))).toEqual(conditions);
  expect(parseConditions("bad")).toEqual([]);
  expect(parseInferenceSort("2:input:a.b.asc")).toEqual([{ id: "2:input:a.b", desc: false }]);
});

describe("inference table feedback cache", () => {
  afterEach(() => vi.restoreAllMocks());

  test.each(["create", "update", "failed-save", "delete"])(
    "refreshes a warmed table after feedback %s",
    async (operation) => {
      const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 300_000 } } });
      const tableKey = [...INFERENCES_QUERY_KEY(42), "infinite", { query: "risk" }];
      const otherTableKey = [...INFERENCES_QUERY_KEY(43), "infinite", { query: "risk" }];
      const derivedKeys = ["metadata", "selection", "facets"].map((kind) => [
        ...INFERENCES_QUERY_KEY(42),
        kind,
        { schemaId: "2" },
      ]);
      derivedKeys.forEach((key) => qc.setQueryData(key, {}));
      qc.setQueryData(tableKey, payload());
      qc.setQueryData(otherTableKey, payload());
      const create = vi
        .spyOn(reviewApi, "createSchemaReviewFeedback")
        .mockResolvedValue(answer(2, "Yes"));
      const update = vi
        .spyOn(reviewApi, "updateSchemaReviewFeedback")
        .mockResolvedValue(answer(2, "No"));
      const request = vi.spyOn(http, "appFetch").mockResolvedValue(undefined);
      if (operation === "failed-save") create.mockRejectedValue(new Error("Save failed"));
      let save!: ReturnType<typeof useSaveSchemaReviewFeedbackMutation>;
      let remove!: ReturnType<typeof useDeleteInferenceReviewResponseMutation>;
      function Mutations() {
        save = useSaveSchemaReviewFeedbackMutation("review", "run");
        remove = useDeleteInferenceReviewResponseMutation();
        return null;
      }
      await mount(<Mutations />, { queryClient: qc });
      const steps = buildSchemaFeedbackSteps(
        version(7, [AGE]),
        [result(2)],
        operation === "update" ? [answer(2, "Yes")] : [],
      );
      await act(async () => {
        if (operation === "delete") {
          await remove.mutateAsync({
            inferenceId: 2,
            reviewId: "review",
            reviewRunId: "run",
            reviewerId: 1,
          });
        } else {
          const saving = save.mutateAsync({
            steps,
            values: { "report-0-output-output-feedback-assessment": "No" },
          });
          if (operation === "failed-save") await expect(saving).rejects.toThrow("Save failed");
          else await saving;
        }
      });
      expect(qc.getQueryState(tableKey)?.isInvalidated).toBe(true);
      derivedKeys.forEach((key) => expect(qc.getQueryState(key)?.isInvalidated).toBe(true));
      expect(qc.getQueryState(otherTableKey)?.isInvalidated).toBe(false);
      if (operation === "update")
        expect(update).toHaveBeenCalledWith(
          "review",
          "run",
          expect.objectContaining({ feedbackId: 2 }),
        );
      else if (operation === "delete")
        expect(request).toHaveBeenCalledWith(expect.stringContaining("/response"), {
          method: "DELETE",
        });
      else
        expect(create).toHaveBeenCalledWith(
          "review",
          "run",
          expect.objectContaining({ resultId: 20, value: { "output-feedback-assessment": "No" } }),
        );
      qc.clear();
    },
  );
});

describe("inference table view", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom lays nothing out; give the scroll area a viewport so rows virtualize into view.
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(1200);
  });
  afterEach(() => vi.restoreAllMocks());

  function Harness({ rows }: { rows: InferenceTableRow[] }) {
    const [sort, setSort] = useState("createdAt.desc");
    const [open, setOpen] = useState<string>();
    const table = useInferenceTable({
      rows,
      dataColumns: serverColumns,
      visibilityKey: "3:2",
      scoped: true,
      sort,
      onSortChange: setSort,
      renderName: ({ item }) => item.name,
      renderActions: () => null,
    });
    return (
      <>
        <InferenceColumnsMenu table={table} />
        <output data-open>{open}</output>
        <InferenceTable
          table={table}
          totalItems={rows.length}
          hasNext={false}
          isFetching={false}
          error={false}
          onLoadMore={vi.fn()}
          onRetry={vi.fn()}
          onOpen={({ item }) => setOpen(String(item.id))}
        />
      </>
    );
  }

  const rowNames = (host: HTMLElement) =>
    [...host.querySelectorAll("tbody tr")].map((row) => row.firstElementChild?.textContent);

  test("groups backend columns, requests sorting without reordering loaded pages, and opens a row", async () => {
    const rows = serverRows;
    const { host } = await mount(<Harness rows={rows} />);
    const headers = [...host.querySelectorAll("thead tr:first-child th")].map(
      (th) => th.textContent,
    );

    expect(headers).toEqual(expect.arrayContaining(["Inputs", "Outputs", "Feedback"]));
    // The summary columns need no title of their own.
    expect(headers).not.toContain("Inference");
    expect(rowNames(host)).toEqual(["Case 2", "Case 1"]);
    await click("Age (years)", host);
    expect(rowNames(host)).toEqual(["Case 2", "Case 1"]);
    expect(host.querySelector('th[aria-sort="ascending"]')?.textContent).toBe("Age (years)");
    await click(host.querySelector("tbody tr")!);
    expect(host.querySelector("[data-open]")?.textContent).toBe("2");
  });

  test("hides the repeated Schema column when scoped and remembers column choices", async () => {
    const rows = serverRows;
    const { host, unmount } = await mount(<Harness rows={rows} />);
    const headerText = () => [...host.querySelectorAll("thead th")].map((th) => th.textContent);

    expect(headerText()).not.toContain("Schema");
    expect(headerText()).toContain("Income");
    await click(
      [...host.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Columns"))!,
    );
    const income = [...document.querySelectorAll("label")].find((label) =>
      label.textContent?.includes("Income"),
    )!;
    await click(income.querySelector("input")!);
    expect(headerText()).not.toContain("Income");

    await unmount();
    const again = await mount(<Harness rows={rows} />);
    expect([...again.host.querySelectorAll("thead th")].map((th) => th.textContent)).not.toContain(
      "Income",
    );
  });
});

describe("inference filters dialog", () => {
  const filters: InferenceFilterChoice = {
    schemaId: "2",
    bookmarkId: "all",
    status: "SUCCESS",
    feedback: "all",
    origin: "all",
    conditions: [{ columnId: "2:input:age", operator: "gt", value: "40" }],
  };

  async function open(onApply = vi.fn()) {
    await mount(<InferenceFiltersDialog filters={filters} onApply={onApply} onClose={vi.fn()} />);
    return onApply;
  }

  test("shows applied conditions and applies only complete ones", async () => {
    const onApply = await open();
    const column = document.querySelector<HTMLInputElement>(
      'input[placeholder="Choose a column…"]',
    );

    expect(column?.value).toBe("Age (years)");
    await click("Add condition");
    await click("Apply filters");
    expect(onApply).toHaveBeenCalledWith(filters);
  });

  test("removes a condition and clears every filter", async () => {
    const onApply = await open();

    await click(document.querySelector('button[aria-label="Remove condition"]')!);
    expect(document.querySelector('input[placeholder="Choose a column…"]')).toBeNull();
    await click("Clear all");
    await click("Apply filters");
    expect(onApply).toHaveBeenCalledWith({
      schemaId: "all",
      bookmarkId: "all",
      status: "all",
      feedback: "all",
      origin: "all",
      conditions: [],
    });
  });
});
