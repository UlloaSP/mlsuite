// @vitest-environment jsdom

import { act } from "react";
import { describe, expect, test, vi } from "vite-plus/test";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { AnswerHistory } from "@/features/schemas/components/AnswerHistory";
import { ReviewerAnswerHistoryButton } from "@/features/schemas/components/ReviewerAnswerHistoryButton";
import { answerHistoryGroups } from "@/features/schemas/lib/answer-history";
import type { PredictionResultFeedbackRevisionDto } from "@/shared/api/openapi.gen";
import { binding, predictionResult, predictionRun, schemaVersion } from "./support/api-fixtures";
import { click, mount } from "./support/dom";

const member = vi.hoisted(() => ({ canViewModels: true }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
  useCan: (permission: string) => permission === "canViewModels" && member.canViewModels,
}));

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
      },
    ],
  },
});
const run = predictionRun({
  id: 5,
  name: "case-17",
  results: [
    predictionResult({
      id: 11,
      modelId: 1,
      output: { reports: [{ mappedTo: "score", prediction: 1, probabilities: [0.1, 0.9] }] },
    }),
  ],
});
const steps = buildSchemaFeedbackSteps(version, run.results, []);

const revision = (
  overrides: Partial<PredictionResultFeedbackRevisionDto>,
): PredictionResultFeedbackRevisionDto => ({
  id: 1,
  feedbackId: 40,
  resultId: 11,
  reviewId: 8,
  review: { publicId: "rev-8", createdAt: "2026-10-20T09:00:00Z", createdByName: "Mia Manager" },
  userId: 21,
  userName: "Rui Reviewer",
  visitorId: null,
  type: "OUTPUT",
  order: 0,
  value: { "output-feedback-assessment": "correct" },
  change: "CREATED",
  changedByUserId: 21,
  changedByName: "Rui Reviewer",
  changedAt: "2026-10-21T10:00:00Z",
  ...overrides,
});

const HISTORY = [
  revision({ id: 1 }),
  revision({ id: 2, change: "UPDATED", value: { "output-feedback-assessment": "incorrect" } }),
  revision({
    id: 3,
    change: "DELETED",
    value: null,
    changedByUserId: 30,
    changedByName: "Mia Manager",
  }),
  revision({
    id: 4,
    userId: 22,
    userName: "Another reviewer",
    changedByUserId: 22,
    changedByName: null,
  }),
  revision({ id: 5, resultId: 99 }),
  revision({ id: 6, type: "EXPLANATION" }),
];

function serve(response: () => Promise<Response>) {
  const fetchMock = vi.fn((_input: string) => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const answer = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

describe("answer history", () => {
  test("keeps each question's changes, newest first, and one author's when asked", () => {
    const [all] = answerHistoryGroups(steps, HISTORY);
    expect(all.step.title).toBe("Score");
    expect(all.revisions.map((item) => item.id)).toEqual([4, 3, 2, 1]);

    const [reviewer] = answerHistoryGroups(steps, HISTORY, 21);
    expect(reviewer.revisions.map((item) => item.id)).toEqual([3, 2, 1]);
    expect(answerHistoryGroups(steps, HISTORY, 77)).toEqual([]);
  });

  test("shows who answered, what, who changed or removed it, when, and in which review", async () => {
    const fetchMock = serve(() => answer(HISTORY));
    const { host } = await mount(<AnswerHistory version={version} steps={steps} authorId={21} />);
    await settle();

    expect(new URL(fetchMock.mock.calls[0]?.[0] ?? "").search).toBe("?resultId=11");
    const entries = [...host.querySelectorAll("li")].map((item) => item.textContent ?? "");
    expect(entries).toHaveLength(3);
    expect(entries[0]).toContain("Removed");
    expect(entries[0]).toContain("Mia Manager");
    expect(entries[0]).toContain("Rui Reviewer’s answer");
    expect(entries[0]).toContain("In the review opened");
    expect(entries[0]).toContain("by Mia Manager");
    expect(entries[1]).toContain("Changed");
    expect(entries[2]).toContain("Answered");
    expect(host.querySelectorAll("li time")).toHaveLength(3);
    expect(host.querySelectorAll("li dl")).toHaveLength(2);
  });

  test("names a public page's answers and members who no longer exist", async () => {
    serve(() =>
      answer([
        revision({
          id: 7,
          review: null,
          reviewId: null,
          userId: null,
          userName: null,
          visitorId: "4b9f8e1c-0000-4000-8000-000000000001",
          changedByUserId: null,
          changedByName: null,
        }),
        revision({ id: 8, review: null, userName: null, changedByName: null }),
      ]),
    );
    const { host } = await mount(<AnswerHistory version={version} steps={steps} />);
    await settle();

    const [deletedReview, visitor] = [...host.querySelectorAll("li")].map(
      (item) => item.textContent,
    );
    expect(visitor).toContain("A public page visitor’s answer · On the public page");
    expect(visitor).toContain("Unknown");
    expect(deletedReview).toContain("Former member’s answer · In a review that was deleted");
  });

  test("says when there is nothing yet", async () => {
    serve(() => answer([]));
    const { host } = await mount(<AnswerHistory version={version} steps={steps} />);
    await settle();

    expect(host.textContent).toContain("No answers yet");
  });

  test("says when the history could not be loaded", async () => {
    serve(() => answer({ status: 403, message: "Forbidden" }, 403));
    const { host } = await mount(<AnswerHistory version={version} steps={steps} />);
    await settle();

    expect(host.textContent).toContain("History unavailable");
  });

  test("shows that it is loading while the history is on its way", async () => {
    serve(() => new Promise<Response>(() => {}));
    const { host } = await mount(<AnswerHistory version={version} steps={steps} />);

    expect(host.textContent).toContain("Loading answer history…");
  });

  test("a reviewer's history opens from their answers, only for members who may read models", async () => {
    serve(() => answer(HISTORY));
    member.canViewModels = false;
    const hidden = await mount(
      <ReviewerAnswerHistoryButton run={run} version={version} reviewerId={21} />,
    );
    expect(hidden.host.querySelector("button")).toBeNull();
    await hidden.unmount();

    member.canViewModels = true;
    await mount(
      <ReviewerAnswerHistoryButton
        run={run}
        version={version}
        reviewerId={21}
        reviewerName="Rui Reviewer"
      />,
    );
    await click("History");
    await settle();

    expect(document.body.textContent).toContain("Rui Reviewer's answers on case-17");
    expect(document.body.querySelectorAll("li")).toHaveLength(3);
  });
});
