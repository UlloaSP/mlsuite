/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import type { InferenceReviewAssignmentDto } from "@/features/inferences/api/inference-api";
import { InferenceReviewTile } from "@/features/inferences/components/InferenceReviewTile";
import { InferenceReviewPage } from "@/features/inferences/pages/inference-review-page";
import { InferenceReviewStatusSection } from "@/features/inferences/components/InferenceReviewStatusSection";
import { ReviewerFeedbackAnswers } from "@/features/schemas/components/ReviewerFeedbackAnswers";
import { click, mount, type Mounted } from "./support/dom";

const state = vi.hoisted(() => ({
  assignments: [] as InferenceReviewAssignmentDto[],
  reopen: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 7,
  useWorkspaceContext: () => ({ data: { permissions: { canManageReviews: true } } }),
}));
vi.mock("@/features/inferences/api/inference-api", () => ({
  useInference: () => ({ data: { id: 1, name: "Case 12" } }),
  useInferenceReviewAssignments: () => ({ data: state.assignments, isLoading: false }),
}));
vi.mock("@/features/inferences/api/inference-mutations", () => ({
  useReopenInferenceReviewMutation: () => ({ mutateAsync: state.reopen, isPending: false }),
  useDeleteInferenceReviewResponseMutation: () => ({ mutateAsync: state.remove, isPending: false }),
}));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  usePredictionRun: () => ({
    data: {
      id: "1",
      schemaVersionId: "3",
      results: [{ id: "r1", modelId: "m1" }],
    },
  }),
  useSchemaVersion: () => ({
    data: { id: "3", bindings: [], formSchema: { fields: [], reports: [] } },
  }),
  predictionResultFeedbackQueryOptions: (_organizationId: number, resultId: string) => ({
    queryKey: ["feedback", resultId],
    queryFn: async () => [
      { id: "f1", resultId, userId: "4", type: "OUTPUT", order: 0, value: { ok: true } },
      { id: "f2", resultId, userId: "9", type: "OUTPUT", order: 0, value: { ok: false } },
    ],
  }),
}));
vi.mock("@/capabilities/prediction-runtime/mlform/executable-schema", () => ({
  toExecutableSchemaVersion: (version: unknown) => version,
}));
vi.mock("@/features/schemas/components/SchemaRunFeedbackSummary", () => ({
  SchemaRunFeedbackSummary: ({ feedback }: { feedback: Array<{ id: string }> }) => (
    <p>Answers {feedback.map((item) => item.id).join(",")}</p>
  ),
}));

const assignment = (
  change: Partial<InferenceReviewAssignmentDto> = {},
): InferenceReviewAssignmentDto => ({
  reviewId: "rev-1",
  reviewRunId: "run-a",
  reviewer: { id: 4, fullName: "Grace Hopper", email: "grace@acme.test" },
  createdBy: { id: 1, fullName: "Ada Lovelace", email: "ada@acme.test" },
  reviewState: "COMPLETED",
  submittedAt: "2026-09-28T15:53:00Z",
  createdAt: "2026-09-28T12:21:00Z",
  updatedAt: "2026-09-28T15:53:00Z",
  expiresAt: "2026-10-29T00:59:00Z",
  expired: false,
  ...change,
});

let view: Mounted;
let container: HTMLDivElement;
beforeEach(() => {
  state.reopen.mockReset().mockResolvedValue(undefined);
  state.remove.mockReset().mockResolvedValue(undefined);
});

async function render(node: React.ReactNode, path = "/") {
  view = await mount(node, { route: path, queryClient: new QueryClient() });
  container = view.host;
  // Query results land after the mount's act; let them render.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

const reviewPage = (
  <Routes>
    <Route
      path="/inferences/:inferenceId/reviews/:reviewRunId/reviewers/:reviewerId"
      element={
        <InferenceReviewPage
          renderAnswers={(id, reviewer) => (
            <p>
              Answers of {reviewer} on {id}
            </p>
          )}
        />
      }
    />
  </Routes>
);

test("a tile names reviewer and requester, and shows expiry only while the review is open", async () => {
  await render(
    <>
      <InferenceReviewTile
        assignment={assignment()}
        to="/inferences/1/reviews/run-a/reviewers/4"
        disabled={false}
        onReopen={vi.fn()}
        onDelete={vi.fn()}
      />
      <InferenceReviewTile
        assignment={assignment({
          reviewState: "PENDING",
          submittedAt: null,
          reviewer: { id: 5, fullName: "Alan", email: "alan@acme.test" },
        })}
        to="/inferences/1/reviews/run-a/reviewers/5"
        disabled={false}
        onReopen={vi.fn()}
        onDelete={vi.fn()}
      />
    </>,
  );
  const [completed, pending] = [...container.querySelectorAll("article")];
  expect(completed.querySelector("a")?.getAttribute("href")).toBe(
    "/inferences/1/reviews/run-a/reviewers/4",
  );
  expect(completed.textContent).toContain("Grace Hopper");
  expect(completed.textContent).toContain("Requested byAda Lovelace");
  expect(completed.textContent).not.toContain("Expires");
  expect(pending.textContent).toContain("SubmittedNot yet");
  expect(pending.textContent).toContain("Expires");
});

test("the review page shows the assignment, the reviewer's answers and its actions", async () => {
  state.assignments = [assignment()];
  await render(reviewPage, "/inferences/1/reviews/run-a/reviewers/4");

  expect(container.querySelector("h1")?.textContent).toBe("Grace Hopper");
  expect(container.textContent).toContain("Answers of 4 on 1");
  const crumbs = [...container.querySelectorAll('nav[aria-label="Breadcrumb"] a')].map((link) =>
    link.getAttribute("href"),
  );
  expect(crumbs).toContain("/inferences/1?tab=reviews");

  await click("Reopen", container);
  await click("Reopen", document.body.querySelector("[role=dialog]")!);
  expect(state.reopen).toHaveBeenCalledWith({
    inferenceId: 1,
    reviewId: "rev-1",
    reviewRunId: "run-a",
    reviewerId: 4,
  });
});

test("a pending assignment offers neither reopen nor delete; a missing one explains itself", async () => {
  state.assignments = [assignment({ reviewState: "PENDING", submittedAt: null })];
  await render(reviewPage, "/inferences/1/reviews/run-a/reviewers/4");
  const labels = [...container.querySelectorAll("button")].map((b) => b.textContent);
  expect(labels).not.toContain("Reopen");
  expect(labels).not.toContain("Delete response");

  await view.unmount();
  await render(reviewPage, "/inferences/1/reviews/run-a/reviewers/99");
  expect(container.textContent).toContain("Review unavailable");
});

test("answers are only the chosen reviewer's", async () => {
  await render(<ReviewerFeedbackAnswers runId="1" reviewerId={4} />);
  expect(container.textContent).toBe("Answers f1");

  await view.unmount();
  await render(<ReviewerFeedbackAnswers runId="1" reviewerId={5} />);
  expect(container.textContent).toContain("No answers yet");
});

test("the reviews list uses the catalog's filters and pagination", async () => {
  state.assignments = Array.from({ length: 11 }, (_, index) =>
    assignment({
      reviewRunId: `run-${index}`,
      reviewer: { id: index + 10, fullName: `Reviewer ${index}`, email: `r${index}@acme.test` },
      reviewState: index < 2 ? "PENDING" : "COMPLETED",
    }),
  );
  await render(<InferenceReviewStatusSection inferenceId={1} inferenceName="Case 12" />);
  expect(container.querySelectorAll("article")).toHaveLength(9);
  expect(container.textContent).toContain("Page 1 of 2");

  await click("Pending", container);
  expect(container.querySelectorAll("article")).toHaveLength(2);
});
