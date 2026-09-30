import { describe, expect, test } from "vite-plus/test";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import type { PredictionRunDto, SchemaVersionDto } from "@/shared/api/openapi.gen";
import { binding, predictionResult, predictionRun, schemaVersion } from "./support/api-fixtures";

const version = schemaVersion({
  name: "Risk",
  bindings: [binding(1)],
  formSchema: {
    fields: [],
    reports: [
      {
        id: "report_1",
        label: "Score",
        kind: "classifier",
        mappedTo: { "model-1": "score" },
        labels: ["No", "Yes"],
        feedbackQuestionnaire: {
          steps: [{ id: "s", fields: [{ kind: "text", label: "Comment" }] }],
        },
      },
    ],
  },
});

const run = predictionRun({
  name: "case",
  status: "PARTIAL_SUCCESS",
  results: [
    predictionResult({
      id: 1,
      modelId: 1,
      output: { reports: [{ mappedTo: "score", prediction: 1, probabilities: [0.1, 0.9] }] },
    }),
    predictionResult({ id: 2, modelId: 2, status: "FAILED" }),
  ],
});

describe("schema feedback steps", () => {
  test("builds output and explanation steps for successful mapped reports only", () => {
    const steps = buildSchemaFeedbackSteps(version, run.results, []);
    expect(steps.map((step) => [step.targets[0]?.resultId, step.type, step.title])).toEqual([
      [1, "OUTPUT", "Score"],
      [1, "EXPLANATION", "Score review"],
    ]);
    expect(steps[0]?.schema.steps[0]?.fields[0]).toMatchObject({
      id: "output-feedback-assessment",
      kind: "category",
    });
  });

  test("uses displayed classifier config when persisted report has no id", () => {
    const noIdVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [
          {
            label: "Predicted class",
            kind: "classifier",
            mappedTo: { "model-1": "score" },
            labels: ["No", "Yes"],
          },
        ],
      },
    };

    const steps = buildSchemaFeedbackSteps(noIdVersion, run.results, []);

    expect(steps[0]?.schema.steps[0]?.fields[0]).toMatchObject({
      id: "output-feedback-assessment",
      kind: "category",
      options: [
        { label: "No", value: "No" },
        { label: "Yes", value: "Yes" },
      ],
    });
  });

  test("builds feedback steps for custom report kinds", () => {
    const customVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [
          {
            id: "custom_report",
            label: "Plugin report",
            kind: "plugin-report",
            mappedTo: { "model-1": "plugin_payload" },
            feedbackQuestionnaire: {
              steps: [{ id: "plugin", fields: [{ kind: "text", id: "note", label: "Note" }] }],
            },
          },
        ],
      },
    };
    const customRun = {
      ...run,
      results: [
        {
          ...run.results[0]!,
          output: {
            reports: [
              {
                id: "custom_report",
                mappedTo: "plugin_payload",
                payload: { blocks: ["Rendered"] },
              },
            ],
          },
        },
      ],
    };

    expect(
      buildSchemaFeedbackSteps(customVersion, customRun.results, []).map((step) => step.type),
    ).toEqual(["EXPLANATION"]);
  });

  test("does not create feedback steps for custom reports without questionnaire", () => {
    const customVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [
          {
            id: "custom_report",
            label: "Plugin report",
            kind: "plugin-report",
            mappedTo: { "model-1": "plugin_payload" },
          },
        ],
      },
    };
    const customRun = {
      ...run,
      results: [
        {
          ...run.results[0]!,
          output: {
            reports: [
              {
                id: "custom_report",
                mappedTo: "plugin_payload",
                payload: { explanation: "Rendered" },
              },
            ],
          },
        },
      ],
    };

    expect(buildSchemaFeedbackSteps(customVersion, customRun.results, [])).toEqual([]);
  });

  test("hides skipped custom report and its feedback questionnaire", () => {
    const customVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [
          {
            id: "tree_1",
            label: "Crystal Tree 1",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree" },
            feedbackQuestionnaire: {
              steps: [{ id: "plugin", fields: [{ kind: "text", id: "note", label: "Note" }] }],
            },
          },
          {
            id: "tree_2",
            label: "Crystal Tree 2",
            kind: "Crystal Tree",
            mappedTo: { "model-2": "crystal-tree" },
            feedbackQuestionnaire: {
              steps: [{ id: "plugin", fields: [{ kind: "text", id: "note", label: "Note" }] }],
            },
          },
        ],
      },
      bindings: [binding(1), binding(2)],
    };
    const customRun = {
      ...run,
      results: [
        {
          ...run.results[0]!,
          output: {
            reports: [{ id: "tree_1", mappedTo: "crystal-tree", payload: { explanation: "ok" } }],
          },
        },
        {
          ...run.results[0]!,
          id: 2,
          modelId: 2,
          output: { reports: [] },
        },
      ],
    };

    expect(
      getSchemaResultReports(customVersion, customRun.results[0]!).map((report) => report.id),
    ).toEqual(["tree_1"]);
    expect(getSchemaResultReports(customVersion, customRun.results[1]!)).toEqual([]);
    expect(
      buildSchemaFeedbackSteps(customVersion, customRun.results, []).map(
        (step) => step.targets[0]?.resultId,
      ),
    ).toEqual([1]);
  });

  test("hides empty custom report payload and its feedback questionnaire", () => {
    const customVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [
          {
            id: "tree_1",
            label: "Crystal Tree 1",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree" },
            feedbackQuestionnaire: {
              steps: [{ id: "plugin", fields: [{ kind: "text", id: "note", label: "Note" }] }],
            },
          },
          {
            id: "tree_2",
            label: "Crystal Tree 2",
            kind: "Crystal Tree",
            mappedTo: { "model-2": "crystal-tree" },
            feedbackQuestionnaire: {
              steps: [{ id: "plugin", fields: [{ kind: "text", id: "note", label: "Note" }] }],
            },
          },
        ],
      },
      bindings: [binding(1), binding(2)],
    };
    const customRun = {
      ...run,
      results: [
        {
          ...run.results[0]!,
          output: {
            reports: [{ id: "tree_1", mappedTo: "crystal-tree", payload: { explanation: "ok" } }],
          },
        },
        {
          ...run.results[0]!,
          id: 2,
          modelId: 2,
          output: {
            reports: [
              {
                id: "tree_2",
                mappedTo: "crystal-tree",
                payload: {
                  endpoint: "/api/analyzer/explanations",
                  explanation: "",
                  modelId: "model-2",
                },
              },
            ],
          },
        },
      ],
    };

    expect(
      getSchemaResultReports(customVersion, customRun.results[0]!).map((report) => report.id),
    ).toEqual(["tree_1"]);
    expect(getSchemaResultReports(customVersion, customRun.results[1]!)).toEqual([]);
    expect(
      buildSchemaFeedbackSteps(customVersion, customRun.results, []).map((step) => step.title),
    ).toEqual(["Crystal Tree 1 review"]);
  });

  test("builds one logical assessment for one report mapped to multiple models", () => {
    const multiModelVersion: SchemaVersionDto = {
      ...version,
      bindings: [binding(1), binding(2)],
      formSchema: {
        fields: [],
        reports: [
          {
            id: "shared-score",
            label: "Shared score",
            kind: "classifier",
            mappedTo: { "model-1": "classifier9", "model-2": "classifier9" },
            labels: ["No", "Yes"],
          },
        ],
      },
    };
    const results: PredictionRunDto["results"] = [
      {
        ...run.results[0]!,
        output: {
          reports: [{ id: "shared-score-model-1", mappedTo: "classifier9", prediction: "Yes" }],
        },
      },
      {
        ...run.results[0]!,
        id: 2,
        modelId: 2,
        output: {
          reports: [{ id: "shared-score-model-2", mappedTo: "classifier9", prediction: "No" }],
        },
      },
    ];

    const steps = buildSchemaFeedbackSteps(multiModelVersion, results, []);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.targets.map((target) => target.resultId)).toEqual([1, 2]);
  });

  test("keeps separate assessments for separate reports sharing an analyzer key", () => {
    const separateVersion: SchemaVersionDto = {
      ...version,
      bindings: [binding(1), binding(2)],
      formSchema: {
        fields: [],
        reports: [
          {
            id: "score-a",
            label: "Score A",
            kind: "classifier",
            mappedTo: { "model-1": "classifier9" },
          },
          {
            id: "score-b",
            label: "Score B",
            kind: "classifier",
            mappedTo: { "model-2": "classifier9" },
          },
        ],
      },
    };
    const results: PredictionRunDto["results"] = [
      {
        ...run.results[0]!,
        output: { reports: [{ id: "score-a", mappedTo: "classifier9", prediction: "Yes" }] },
      },
      {
        ...run.results[0]!,
        id: 2,
        modelId: 2,
        output: { reports: [{ id: "score-b", mappedTo: "classifier9", prediction: "No" }] },
      },
    ];

    const steps = buildSchemaFeedbackSteps(separateVersion, results, []);

    expect(steps.map((step) => step.title)).toEqual(["Score A", "Score B"]);
    expect(steps.map((step) => step.targets)).toMatchObject([[{ resultId: 1 }], [{ resultId: 2 }]]);
  });
});
