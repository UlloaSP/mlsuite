// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { InferenceDetailPage } from "@/features/inferences/pages/inference-detail-page";

const state = vi.hoisted(() => ({
  canRun: false,
  canManageReviews: false,
  bookmarkId: 4 as number | null,
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
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
  useInferenceReviewAssignments: (_id: number, enabled: boolean) => ({
    data: enabled ? [{ reviewState: "COMPLETED" }, { reviewState: "IN_PROGRESS" }] : undefined,
  }),
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

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

test.each([
  { canRun: false, canManageReviews: false, bookmarkId: 4 },
  { canRun: true, canManageReviews: false, bookmarkId: 4 },
  { canRun: true, canManageReviews: true, bookmarkId: null },
  { canRun: false, canManageReviews: true, bookmarkId: 4 },
])("run=$canRun reviews=$canManageReviews bookmark=$bookmarkId", async (permissions) => {
  Object.assign(state, permissions);
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={["/inferences/1"]}>
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
        </Routes>
      </MemoryRouter>,
    ),
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
