// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { act, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { useSaveSchemaReviewFeedbackMutation } from "@/features/reviews/api/review-mutations";
import { useDeleteInferenceReviewResponseMutation } from "@/features/inferences/api/inference-mutations";
import { inferenceTableQueryOptions } from "@/features/inferences/api/inference-api";
import * as reviewApi from "@/features/reviews/api/review-api";
import * as http from "@/shared/api/http";
import { InferenceTable } from "@/features/inferences/components/InferenceTable";
import { InferenceColumnsMenu } from "@/features/inferences/components/InferenceColumnsMenu";
import {
  InferenceFiltersDialog,
  type InferenceFilterChoice,
} from "@/features/inferences/components/InferenceFiltersDialog";
import {
  filterInferences,
  type InferenceFilters,
} from "@/features/inferences/lib/inference-filter";
import {
  columnKind,
  distinctColumnValues,
  parseConditions,
  serializeConditions,
  type ConditionOperator,
} from "@/features/inferences/lib/inference-conditions";
import {
  buildInferenceTableRows,
  inferenceDataColumns,
  type InferenceTableRow,
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
import { inferenceAuthor } from "@/features/inferences/lib/inference-table-columns";
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

const byId = (rows: InferenceTableRow[], id: number) => rows.find((row) => row.item.id === id)!;

describe("inference table rows", () => {
  const answers = (row: InferenceTableRow) =>
    row.columns
      .filter((column) => column.group === "feedback")
      .map((column) => [column.label, row.values.get(column.id)]);

  test("joins each run with its inputs, outputs and each reviewer's answers", () => {
    const rows = buildInferenceTableRows(payload());
    const latest = byId(rows, 2);

    expect(latest.values.get("2:input:age")).toBe(52);
    expect(latest.values.get("2:output:1:score")).toBe("Yes");
    expect(latest.feedbackStatus).toBe("COMPLETED");
    expect(answers(latest)).toEqual([
      [expect.stringMatching(/^Score · .+ · grace@example.com$/), "Yes"],
    ]);
    expect(byId(rows, 1).feedbackStatus).toBe("PENDING");
    expect(answers(byId(rows, 1))).toEqual([]);
  });

  test("gives every reviewer their own column", () => {
    const rows = buildInferenceTableRows(
      payload({
        feedback: [
          answer(2, "Yes"),
          { ...answer(2, "No"), id: 8, userId: 2, userEmail: "alan@example.com" },
        ],
      }),
    );
    const reviewers = answers(byId(rows, 2)).map(([label, value]) => [
      String(label).split(" · ").at(-1),
      value,
    ]);
    expect(reviewers).toEqual([
      ["grace@example.com", "Yes"],
      ["alan@example.com", "No"],
    ]);
  });

  test("shows Mixed when one reviewer answered a combined report differently per model", () => {
    const rows = buildInferenceTableRows(
      payload({
        results: [result(2), { ...result(2), id: 21, modelId: 1 }, result(1)],
        feedback: [answer(2, "Yes"), { ...answer(2, "No"), id: 9, resultId: 21 }],
      }),
    );
    expect(answers(byId(rows, 2)).map(([, value]) => value)).toEqual(["Mixed"]);
  });

  test("unions columns across versions with the newest label and leaves missing fields empty", () => {
    const rows = buildInferenceTableRows(payload());
    const columns = inferenceDataColumns(rows);

    expect(columns.map((column) => [column.group, column.label])).toEqual([
      ["inputs", "Age (years)"],
      ["inputs", "Income"],
      ["outputs", "Score"],
      ["feedback", expect.stringMatching(/^Score · /)],
    ]);
    expect(byId(rows, 1).values.has("2:input:income")).toBe(false);
  });

  test("keeps equally named fields of different schemas in separate columns", () => {
    const support = summary(3, { schemaId: 4, schemaName: "Support", schemaVersionId: 9 });
    const rows = buildInferenceTableRows(
      payload({
        runs: [
          { summary: support, inputData: { age: 70 } },
          { summary: summary(2), inputData: { age: 52 } },
        ],
        results: [],
        feedback: [],
        versions: [version(9, [AGE]), version(7, [AGE])],
      }),
    );
    const inputs = inferenceDataColumns(rows).filter((column) => column.group === "inputs");

    expect(inputs.map((column) => [column.schemaName, column.id])).toEqual([
      ["Support", "4:input:age"],
      ["Risk", "2:input:age"],
    ]);
    expect(byId(rows, 2).values.has("4:input:age")).toBe(false);
  });

  test("keeps optional input columns when every run has an empty value", () => {
    const rows = buildInferenceTableRows(
      payload({ runs: [{ summary: summary(2), inputData: {} }] }),
    );
    expect(inferenceDataColumns(rows).filter((column) => column.group === "inputs")).toEqual([
      expect.objectContaining({ id: "2:input:age", label: "Age (years)" }),
      expect.objectContaining({ id: "2:input:income", label: "Income" }),
    ]);
    expect(rows[0]!.values.has("2:input:age")).toBe(false);
  });

  test("preserves each model's output for a shared report, with stable columns across versions", () => {
    const latest = version(
      7,
      [AGE],
      [
        {
          kind: "classifier",
          label: "Score",
          mappedTo: { 1: "score", 2: "score" },
          labels: ["No", "Yes"],
        },
      ],
    );
    latest.bindings.push({ ...latest.bindings[0]!, id: 2, modelId: 2 });
    const rows = buildInferenceTableRows(
      payload({
        versions: [latest, version(6, [AGE])],
        results: [result(2), { ...result(2, 0), id: 21, modelId: 2 }, result(1, 0)],
      }),
    );
    expect(byId(rows, 2).values.get("2:output:1:score")).toBe("Yes");
    expect(byId(rows, 2).values.get("2:output:2:score")).toBe("No");
    expect(byId(rows, 1).values.get("2:output:1:score")).toBe("No");
    expect(
      inferenceDataColumns(rows)
        .filter((column) => column.group === "outputs")
        .map((column) => column.label),
    ).toEqual(["Score · Model 1", "Score · Model 2"]);
  });

  test("keeps distinct feedback reports separate even when their titles match", () => {
    const rows = buildInferenceTableRows(
      payload({
        runs: [{ summary: summary(2), inputData: {} }],
        versions: [
          version(
            7,
            [AGE],
            [
              {
                id: "a",
                kind: "classifier",
                label: "Score",
                mappedTo: { 1: "a" },
                labels: ["No", "Yes"],
              },
              {
                id: "b",
                kind: "classifier",
                label: "Score",
                mappedTo: { 1: "b" },
                labels: ["No", "Yes"],
              },
            ],
          ),
        ],
        results: [
          {
            ...result(2),
            output: {
              reports: [
                { mappedTo: "a", prediction: 1 },
                { mappedTo: "b", prediction: 0 },
              ],
            },
          },
        ],
        feedback: [answer(2, "Yes"), { ...answer(2, "No"), id: 3, order: 1 }],
      }),
    );
    const columns = rows[0]!.columns.filter((column) => column.group === "feedback");
    expect(new Set(columns.map((column) => column.id)).size).toBe(2);
    expect(columns.map((column) => rows[0]!.values.get(column.id))).toEqual(["Yes", "No"]);
  });

  test("keeps feedback tied to its snapshot when report labels change", () => {
    const report = {
      id: "score",
      kind: "classifier",
      mappedTo: { 1: "score" },
      labels: ["No", "Yes"],
    };
    const rows = buildInferenceTableRows(
      payload({
        versions: [
          version(7, [AGE], [{ ...report, label: "New score" }]),
          version(6, [AGE], [{ ...report, label: "Old score" }]),
        ],
        feedback: [answer(2, "Yes"), answer(1, "No")],
      }),
    );
    const columns = inferenceDataColumns(rows).filter((column) => column.group === "feedback");
    expect(columns).toHaveLength(2);
    expect(columns[0]!.label).toMatch(/^New score · /);
    expect(columns[1]!.label).toMatch(/^Old score · /);
    expect(byId(rows, 2).values.get(columns[0]!.id)).toBe("Yes");
    expect(byId(rows, 1).values.get(columns[1]!.id)).toBe("No");
    expect(byId(rows, 1).values.has(columns[0]!.id)).toBe(false);
  });

  test("does not merge different reports when their order changes between snapshots", () => {
    const a = { kind: "classifier", label: "A", mappedTo: { 1: "a" }, labels: ["No", "Yes"] };
    const b = { kind: "classifier", label: "B", mappedTo: { 1: "b" }, labels: ["No", "Yes"] };
    const output = {
      reports: [
        { mappedTo: "a", prediction: 1 },
        { mappedTo: "b", prediction: 0 },
      ],
    };
    const rows = buildInferenceTableRows(
      payload({
        versions: [version(7, [AGE], [b, a]), version(6, [AGE], [a, b])],
        results: [
          { ...result(2), output },
          { ...result(1), output },
        ],
        feedback: [answer(2, "No"), answer(1, "Yes")],
      }),
    );
    const columns = inferenceDataColumns(rows).filter((column) => column.group === "feedback");
    expect(columns).toHaveLength(2);
    expect(columns.map((column) => column.label)).toEqual([
      expect.stringMatching(/^B · /),
      expect.stringMatching(/^A · /),
    ]);
    expect(byId(rows, 2).values.get(columns[0]!.id)).toBe("No");
    expect(byId(rows, 1).values.get(columns[1]!.id)).toBe("Yes");
  });

  test("marks feedback unavailable for a malformed or invalid schema, and not configured without reports", () => {
    const malformed = buildInferenceTableRows(
      payload({ versions: [version(7, [AGE], [{ kind: "classifier" }]), version(6, [AGE])] }),
    );
    const invalid = buildInferenceTableRows(
      payload({
        versions: [
          version(
            7,
            [AGE],
            [
              {
                kind: "classifier",
                label: "Score",
                mappedTo: { 1: "score" },
                feedbackQuestionnaire: { steps: [{ fields: [] }] },
              },
            ],
          ),
          version(6, [AGE]),
        ],
      }),
    );
    const empty = buildInferenceTableRows(
      payload({ versions: [version(7, [AGE], []), version(6, [AGE])] }),
    );

    expect(byId(malformed, 2).feedbackStatus).toBe("ERROR");
    expect(byId(malformed, 2).values.get("2:input:age")).toBe(52);
    expect(byId(invalid, 2).feedbackStatus).toBe("ERROR");
    expect(byId(empty, 2).feedbackStatus).toBe("NOT_REQUIRED");
  });

  test("searches every shown value and filters by schema, bookmark, status, feedback and conditions", () => {
    const rows = buildInferenceTableRows(payload());
    const filters: InferenceFilters = {
      query: "",
      schemaId: "all",
      bookmarkId: "all",
      status: "all",
      feedback: "all",
      origin: "all",
      conditions: [],
    };
    const ids = (overrides: Partial<InferenceFilters>) =>
      filterInferences(rows, { ...filters, ...overrides }).map((row) => row.item.id);
    const where = (columnId: string, operator: ConditionOperator, value = "") => ({
      conditions: [{ columnId, operator, value }],
    });

    expect(ids({ query: "52" })).toEqual([2]);
    expect(ids({ feedback: "PENDING" })).toEqual([1]);
    expect(ids({ schemaId: "3" })).toEqual([]);
    expect(ids({ bookmarkId: "unbookmarked" })).toEqual([]);
    expect(ids({ status: "FAILED" })).toEqual([]);
    expect(ids(where("2:input:age", "gt", "40"))).toEqual([2]);
    expect(ids(where("2:input:age", "lte", "31"))).toEqual([1]);
    expect(ids(where("2:output:1:score", "is", "No"))).toEqual([1]);
    expect(ids(where("2:output:1:score", "contains", "ye"))).toEqual([2]);
    expect(ids(where("2:input:income", "empty"))).toEqual([1]);
    expect(ids(where("2:input:income", "notEmpty"))).toEqual([2]);
    expect(ids(where("2:output:1:score", "gt", "1"))).toEqual([]);
  });

  test("a run from the public page is a visitor's: so named, so filtered, its feedback theirs", () => {
    const rows = buildInferenceTableRows(
      payload({
        runs: [
          {
            summary: summary(3, { origin: "PUBLIC", createdByName: null, createdByEmail: null }),
            inputData: { age: 70 },
          },
          { summary: summary(2), inputData: { age: 52, income: 900 } },
        ],
        results: [result(3), result(2)],
        feedback: [{ ...answer(3, "No"), userId: null, userName: null, userEmail: null }],
      }),
    );
    expect(inferenceAuthor(byId(rows, 3).item)).toBe("Visitor");
    expect(inferenceAuthor(byId(rows, 2).item)).toBe("Ada Lovelace");
    expect(byId(rows, 3).searchText).toContain("visitor");
    expect(byId(rows, 3).columns.find((column) => column.group === "feedback")?.label).toContain(
      "Visitor",
    );
    const ids = (origin: InferenceFilters["origin"]) =>
      filterInferences(rows, {
        query: "",
        schemaId: "all",
        bookmarkId: "all",
        status: "all",
        feedback: "all",
        origin,
        conditions: [],
      }).map((row) => row.item.id);
    expect(ids("PUBLIC")).toEqual([3]);
    expect(ids("WORKSPACE")).toEqual([2]);
    expect(ids("all")).toEqual([3, 2]);
  });

  test("infers numeric columns and lists the values a column shows", () => {
    const rows = buildInferenceTableRows(payload());
    expect(columnKind(rows, "2:input:age")).toBe("number");
    expect(columnKind(rows, "2:output:1:score")).toBe("text");
    expect(distinctColumnValues(rows, "2:output:1:score")).toEqual(["No", "Yes"]);
  });

  test("keeps conditions in the URL and drops malformed ones", () => {
    const conditions = [{ columnId: "2:input:a.b", operator: "gte" as const, value: "4" }];
    expect(parseConditions(serializeConditions(conditions))).toEqual(conditions);
    expect(serializeConditions([])).toBe("");
    expect(parseConditions('[["x","drop","1"],["y","is"],"z"]')).toEqual([]);
    expect(parseConditions("{not json")).toEqual([]);
  });

  test("reads the URL sort, including ids with dots, and falls back to newest first", () => {
    expect(parseInferenceSort("2:input:a.b.asc")).toEqual([{ id: "2:input:a.b", desc: false }]);
    expect(parseInferenceSort("garbage")).toEqual([{ id: "createdAt", desc: true }]);
  });
});

describe("inference table feedback cache", () => {
  afterEach(() => vi.restoreAllMocks());

  test.each(["create", "update", "failed-save", "delete"])(
    "refreshes a warmed table after feedback %s",
    async (operation) => {
      const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 300_000 } } });
      const tableKey = inferenceTableQueryOptions(42).queryKey;
      const otherTableKey = inferenceTableQueryOptions(43).queryKey;
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
      dataColumns: inferenceDataColumns(rows),
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
          openId={open}
          onOpen={({ item }) => setOpen(String(item.id))}
        />
      </>
    );
  }

  const rowNames = (host: HTMLElement) =>
    [...host.querySelectorAll("tbody tr")].map((row) => row.firstElementChild?.textContent);

  test("groups schema columns, sorts by a data column and opens a row", async () => {
    const rows = buildInferenceTableRows(payload());
    const { host } = await mount(<Harness rows={rows} />);
    const headers = [...host.querySelectorAll("thead tr:first-child th")].map(
      (th) => th.textContent,
    );

    expect(headers).toEqual(expect.arrayContaining(["Inference", "Inputs", "Outputs", "Feedback"]));
    expect(rowNames(host)).toEqual(["Case 2", "Case 1"]);
    await click("Age (years)", host);
    expect(rowNames(host)).toEqual(["Case 1", "Case 2"]);
    expect(host.querySelector('th[aria-sort="ascending"]')?.textContent).toBe("Age (years)");
    await click(host.querySelector("tbody tr")!);
    expect(host.querySelector("[data-open]")?.textContent).toBe("1");
    expect(host.querySelector("tbody tr")?.getAttribute("data-selected")).toBe("true");
  });

  test("hides the repeated Schema column when scoped and remembers column choices", async () => {
    const rows = buildInferenceTableRows(payload());
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
    const rows = buildInferenceTableRows(payload());
    await mount(
      <InferenceFiltersDialog filters={filters} rows={rows} onApply={onApply} onClose={vi.fn()} />,
    );
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
