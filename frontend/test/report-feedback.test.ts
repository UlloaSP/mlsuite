import { describe, expect, it } from "vite-plus/test";
import {
  extractPredictionReportEntries,
  getFormattedReportContent,
} from "../src/models/report-feedback-utils";
import { createPredictionTransport } from "../src/app/utils/mlform/transport";
import { createOutputFeedbackQuestionnaire } from "../src/models/output-feedback-questionnaire";
import { buildTargetFeedbackValue } from "../src/models/target-utils";
import { formatFeedbackValue } from "../src/models/questionnaire-feedback";
import {
  buildCombinedReviewQuestionnaire,
  buildReviewFeedbackSteps,
  valuesForStep,
} from "../src/review/components/reviewCombinedQuestionnaire";

const questionnaire = {
  steps: [
    {
      id: "report-feedback",
      title: "Report Feedback",
      fields: [{ kind: "rating", id: "clarity", label: "Clarity", max: 5 }],
    },
  ],
};

const predictionValue = {
  reports: {
    "crystal-tree": {
      explanations: ["Predicted class 2 || petal_length > 4.8"],
    },
  },
};

const parsePostedData = async (
  body: BodyInit | null | undefined,
): Promise<Record<string, unknown>> => {
  expect(body).toBeInstanceOf(FormData);
  const data = (body as FormData).get("data");
  expect(data).toBeInstanceOf(File);
  return JSON.parse(await (data as File).text()) as Record<string, unknown>;
};

describe("report feedback metadata", () => {
  it("uses classifier mapping values for output feedback", () => {
    const schema = {
      reports: [
        {
          kind: "classifier",
          label: "Predicted class",
          labels: ["sedan", "truck", "cab"],
        },
      ],
    };
    const prediction = {
      outputs: [{ type: "classifier", mapping: ["0", "1", "cab"] }],
    };
    const target = {
      id: "target-1",
      predictionId: "prediction-1",
      order: 0,
      value: { value: "cab", classIndex: 2, probability: 1 },
      createdAt: "2026-05-25T00:00:00Z",
    };
    const outputQuestionnaire = createOutputFeedbackQuestionnaire(
      schema.reports[0],
      target,
      prediction,
    );

    expect(outputQuestionnaire.steps[0].fields[0].options).toContainEqual({
      label: "cab",
      value: "cab",
    });
    expect(buildTargetFeedbackValue("cab", schema, 0, prediction)).toEqual({
      value: "cab",
      classIndex: 2,
    });
    expect(
      formatFeedbackValue("cab", {
        options: [{ label: "taxi", value: "cab" }],
      }),
    ).toBe("taxi (cab)");
  });

  it("omits mapped-category parent controls from analyzer payload", async () => {
    let posted: Record<string, unknown> | null = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      posted = await parsePostedData(init?.body);
      return new Response(JSON.stringify({ outputs: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      await createPredictionTransport("demo", [
        {
          id: "rec-vhc",
          kind: "mapped-category",
          label: "rec_vhc",
          options: [{ mapping: { "rec-vhc-0-0": "1", "rec-vhc-1-0": "0" } }],
        },
        { id: "rec-vhc-0-0", kind: "text", label: "rec_vhc__0.0" },
        { id: "rec-vhc-1-0", kind: "text", label: "rec_vhc__1.0" },
      ]).submit({
        values: {},
        fieldValues: {},
        serializedValues: {
          "rec-vhc": "0.0",
          "rec-vhc-0-0": "1",
          "rec-vhc-1-0": "0",
        },
        serializedFieldValues: {},
        fields: [],
        reports: [],
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(posted).toEqual({
      "rec_vhc__0.0": "1",
      "rec_vhc__1.0": "0",
    });
  });

  it("detects embedded questionnaire without loading plugin catalog", () => {
    const entries = extractPredictionReportEntries(
      predictionValue,
      {
        fields: [{ kind: "number", label: "petal_length" }],
        reports: [
          {
            kind: "Crystal Tree",
            id: "crystal-tree",
            feedbackQuestionnaire: questionnaire,
          },
        ],
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].feedbackQuestionnaire).toEqual(questionnaire);
  });

  it("uses formatted report feedback value as displayable report content", () => {
    expect(getFormattedReportContent("Predicted class abc || petal_width <= 2")).toEqual([
      "Predicted class abc\n└─ petal_width <= 2",
    ]);
  });

  it("keeps report review steps when result content is missing", () => {
    const entries = extractPredictionReportEntries(
      { reports: {} },
      {
        fields: [{ kind: "number", label: "petal_length" }],
        reports: [
          {
            kind: "Crystal Tree",
            id: "crystal-tree",
            label: "Crystal Tree",
            feedbackQuestionnaire: questionnaire,
          },
        ],
      },
    );
    const steps = buildReviewFeedbackSteps({
      targets: [{ order: 0, value: "setosa" }],
      outputFeedbackByOrder: new Map(),
      explanationFeedbackByOrder: new Map(),
      reports: [{ kind: "classifier", labels: ["setosa"], label: "species" }],
      signatureSchema: { reports: [{ kind: "classifier", labels: ["setosa"], label: "species" }] },
      predictionValue: { outputs: ["setosa"] },
      feedbackReports: entries,
    });

    expect(steps.map((step) => step.title)).toEqual(["Output 1: species", "Report 1: Crystal Tree"]);
  });

  it("uses default editable questionnaire for old feedback-enabled schemas", () => {
    const entries = extractPredictionReportEntries(
      predictionValue,
      {
        fields: [{ kind: "number", label: "petal_length" }],
        reports: [
          {
            kind: "Crystal Tree",
            id: "crystal-tree",
            feedbackEnabled: true,
          },
        ],
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].feedbackQuestionnaire?.steps[0].fields.map((field) => field.label)).toEqual([
      "Clarity", "Usefulness", "Trust",
    ]);
  });

  it("builds one review wizard with output then report steps", () => {
    const steps = buildReviewFeedbackSteps({
      targets: [{ order: 0, value: "setosa" }],
      outputFeedbackByOrder: new Map(),
      explanationFeedbackByOrder: new Map(),
      reports: [{ kind: "classifier", labels: ["setosa"], label: "species" }],
      signatureSchema: { reports: [{ kind: "classifier", labels: ["setosa"], label: "species" }] },
      predictionValue: { outputs: ["setosa"] },
      feedbackReports: [
        {
          order: 0,
          reportId: "crystal-tree",
          label: "Crystal Tree",
          content: ["petal_length > 4.8"],
          feedbackQuestionnaire: questionnaire,
        },
      ],
    });
    const combined = buildCombinedReviewQuestionnaire(steps);

    expect(steps.map((step) => step.kind)).toEqual(["output", "report"]);
    expect(combined.schema.steps.map((step) => step.title)).toEqual(["Output 1: species", "Report 1: Crystal Tree"]);
    expect(combined.schema.steps[0].description).toContain("setosa");
    expect(combined.schema.steps[1].description).toContain("petal_length > 4.8");
  });

  it("maps combined review wizard values back to each feedback payload", () => {
    const steps = buildReviewFeedbackSteps({
      targets: [{ order: 0, value: "setosa" }],
      outputFeedbackByOrder: new Map(),
      explanationFeedbackByOrder: new Map(),
      reports: [{ questionnaire }],
      signatureSchema: { outputs: [{ name: "species" }] },
      predictionValue: { outputs: ["setosa"] },
      feedbackReports: [
        {
          order: 1,
          reportId: "crystal-tree",
          label: "Crystal Tree",
          content: ["petal_length > 4.8"],
          feedbackQuestionnaire: questionnaire,
        },
      ],
    });

    expect(
      valuesForStep(
        {
          "output-0-output-feedback-assessment": 4,
          "report-1-clarity": 5,
        },
        steps[0],
      ),
    ).toEqual({ "output-feedback-assessment": 4 });
    expect(
      valuesForStep(
        {
          "output-0-output-feedback-assessment": 4,
          "report-1-clarity": 5,
        },
        steps[1],
      ),
    ).toEqual({ clarity: 5 });
  });
});
