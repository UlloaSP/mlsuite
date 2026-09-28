/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vite-plus/test";
import { PageFacts } from "@/app/components/welcome/PageFacts";

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => (props: Record<string, string | undefined>) =>
    [name, ...Object.values(props).filter(Boolean)].join(":"),
}));

vi.mock("@/app/components/welcome/BookmarkVisitFacts", () => ({
  BookmarkVisitFacts: stub("bookmark"),
}));
vi.mock("@/app/components/welcome/InferenceVisitFacts", () => ({
  InferenceVisitFacts: stub("inference"),
}));
vi.mock("@/app/components/welcome/facts/PredictCatalogFacts", () => ({
  PredictCatalogFacts: stub("predict"),
}));
vi.mock("@/app/components/welcome/facts/ModelsCatalogFacts", () => ({
  ModelsCatalogFacts: stub("models"),
}));
vi.mock("@/app/components/welcome/facts/ModelFacts", () => ({ ModelFacts: stub("model") }));
vi.mock("@/app/components/welcome/facts/SchemasCatalogFacts", () => ({
  SchemasCatalogFacts: stub("schemas"),
}));
vi.mock("@/app/components/welcome/facts/SchemaFacts", () => ({ SchemaFacts: stub("schema") }));
vi.mock("@/app/components/welcome/facts/InferencesCatalogFacts", () => ({
  InferencesCatalogFacts: stub("inferences"),
}));
vi.mock("@/app/components/welcome/facts/ReviewFacts", () => ({ ReviewFacts: stub("review") }));
vi.mock("@/app/components/welcome/facts/PluginsFacts", () => ({ PluginsFacts: stub("plugins") }));
vi.mock("@/app/components/welcome/facts/OrganizationsFacts", () => ({
  OrganizationsFacts: stub("organizations"),
}));
vi.mock("@/app/components/welcome/facts/UsersFacts", () => ({ UsersFacts: stub("users") }));
vi.mock("@/app/components/welcome/facts/InfrastructureFacts", () => ({
  InfrastructureFacts: stub("infra"),
}));

test.each([
  ["/predict", "predict"],
  ["/predict/7", "bookmark:7"],
  ["/models", "models"],
  ["/models/3", "model:3"],
  ["/models/create", ""],
  ["/schemas", "schemas"],
  ["/schemas/5/snapshots", "schema:5"],
  ["/schemas/5/drafts/9/conflicts", "schema:5:9"],
  ["/schemas/5/versions/2", "schema:5:2"],
  ["/inferences", "inferences"],
  ["/inferences/1/reviews/r/reviewers/4", "inference:1"],
  ["/review", "review"],
  ["/review/abc/runs/xyz", "review:abc:xyz"],
  ["/plugins/upload", "plugins"],
  ["/workspace/organizations/3", "organizations"],
  ["/admin/users", "users"],
  ["/admin/infrastructure", "infra"],
  ["/profile", ""],
])("%s shows its own facts", async (path, expected) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<PageFacts path={path} />));
  expect(container.textContent).toBe(expected);
  await act(async () => root.unmount());
});
