// @vitest-environment jsdom

import { beforeEach, expect, test, vi } from "vite-plus/test";
import { ModelDetailPage } from "@/features/models/pages/model-detail-page";
import { HttpError } from "@/shared/api/http";
import type { ModelDto } from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

const queries = vi.hoisted(() => ({
  model: { data: undefined as ModelDto | undefined, error: null as Error | null },
}));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: 1 } }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({ data: { permissions: { canEditModels: true } } }),
}));
vi.mock("@/features/models/api/model.queries", () => ({
  useModel: () => ({ ...queries.model, isLoading: false }),
  useModelDetails: () => ({ data: undefined, isLoading: false }),
}));

const model = (archivedAt: string | null): ModelDto => ({
  archivedAt,
  createdAt: "2026-10-01T10:00:00Z",
  fieldCount: 1,
  fileName: "risk.mlbundle",
  id: 12,
  inputSchema: { fields: [] },
  name: "Risk",
  reportCount: 1,
  runtimeError: null,
  runtimeState: "READY",
  specificType: "Pipeline",
  type: "classifier",
  updatedAt: "2026-10-02T10:00:00Z",
  updatedByAvatarUrl: null,
  updatedByEmail: "ada@example.com",
  updatedByName: "Ada",
  version: 1,
});

beforeEach(() => {
  queries.model = { data: undefined, error: null };
});

test("an archived model opens with its archived state and no new-schema action", async () => {
  queries.model = { data: model("2026-10-05T10:00:00Z"), error: null };
  await mount(<ModelDetailPage />, { route: "/models/12" });

  expect(document.body.textContent).toContain("Risk");
  expect(document.body.textContent).toContain("Archived");
  expect(document.body.textContent).not.toContain("Model not found");
  expect(document.body.textContent).not.toContain("New schema");
});

test("an active model offers a new schema and shows no archived state", async () => {
  queries.model = { data: model(null), error: null };
  await mount(<ModelDetailPage />, { route: "/models/12" });

  expect(document.body.textContent).toContain("New schema");
  expect(document.body.textContent).not.toContain("Archived");
});

test("a missing model is reported as not found", async () => {
  queries.model = {
    data: undefined,
    error: new HttpError({ status: 404, message: "gone", path: "/", timestamp: "now" }),
  };
  await mount(<ModelDetailPage />, { route: "/models/12" });

  expect(document.body.textContent).toContain("Model not found");
  expect(document.body.textContent).toContain("deleted or belong to another organization");
});
