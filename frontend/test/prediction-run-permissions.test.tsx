// @vitest-environment jsdom
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vite-plus/test";
import { InferenceDetailPage } from "@/features/inferences/pages/inference-detail-page";
import { mount } from "./support/dom";

const state = vi.hoisted(() => ({
  canRun: false,
  canManageReviews: false,
  bookmarkId: 4 as number | null,
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
  useWorkspaceContext: () => ({
    data: {
      permissions: {
        canRunPredictions: state.canRun,
        canManageReviews: state.canManageReviews,
      },
    },
  }),
}));
vi.mock("@/features/inferences/api/inference-api", () => ({
  useInference: () => ({
    isLoading: false,
    data: {
      id: 1,
      name: "QA run",
      status: "SUCCESS",
      createdAt: "2026-09-09T10:00:00Z",
      schemaId: 2,
      schemaName: "Risk",
      schemaVersionId: 3,
      schemaVersion: 1,
      schemaVersionName: "First",
      bookmarkId: state.bookmarkId,
      bookmarkName: state.bookmarkId == null ? null : "production",
    },
  }),
}));
vi.mock("@/features/inferences/components/InferenceReviewStatusSection", () => ({
  InferenceReviewStatusSection: () => <section>Review management</section>,
}));

test.each([
  { canRun: false, canManageReviews: false, bookmarkId: 4 },
  { canRun: true, canManageReviews: false, bookmarkId: 4 },
  { canRun: true, canManageReviews: true, bookmarkId: null },
  { canRun: false, canManageReviews: true, bookmarkId: 4 },
])("run=$canRun reviews=$canManageReviews bookmark=$bookmarkId", async (permissions) => {
  Object.assign(state, permissions);
  const { host: container } = await mount(
    <Routes>
      <Route
        path="/inferences/:inferenceId"
        element={
          <InferenceDetailPage
            renderData={(_inference, reviews) => (
              <div>
                <p>Count {reviews?.count ?? "none"}</p>
                {reviews?.content}
              </div>
            )}
          />
        }
      />
    </Routes>,
    { route: "/inferences/1" },
  );

  const predictAgain = [...container.querySelectorAll("a")].find(
    (link) => link.textContent === "Predict again",
  );
  // Predicting again needs the permission and a bookmark to run.
  expect(Boolean(predictAgain)).toBe(state.canRun && state.bookmarkId != null);
  if (predictAgain) expect(predictAgain.getAttribute("href")).toBe("/predict/4?from=1");
  expect(container.textContent?.includes("Review management")).toBe(state.canManageReviews);
  // The Reviews tab counts completed reviews out of all assignments.
  expect(container.textContent).toContain(state.canManageReviews ? "Count 1/2" : "Count none");
  expect(container.querySelector("h1")?.textContent).toBe("QA run");
});

vi.mock("@/features/schemas/api/schema-catalog-queries", () => ({
  useBookmarkExampleState: () => ({ data: { example: null } }),
}));

vi.mock("@/features/inferences/api/inference-review-catalog", () => ({
  useReviewAssignmentCounts: () => ({ data: { total: 2, completed: 1 } }),
}));
