import { existsSync, readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vite-plus/test";
import {
  INFERENCES_QUERY_KEY,
  INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY,
} from "@/features/inferences/api/inference-api";
import { groupReviewCandidates } from "@/capabilities/review-creation/review-creation-api";
import { invalidatePredictionRunCollections } from "@/features/schemas/api/schema-prediction-mutations";
import { ORGANIZATION_BOOKMARKS_QUERY_KEY } from "@/features/schemas/api/schema-keys";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

const inference = (
  overrides: Partial<PredictionRunCatalogItemDto> = {},
): PredictionRunCatalogItemDto => ({
  id: 11,
  name: "Fraud check",
  status: "SUCCESS",
  createdAt: "2026-07-22T08:00:00Z",
  updatedAt: "2026-07-22T08:01:00Z",
  schemaId: 2,
  schemaName: "Risk",
  schemaVersionId: 7,
  schemaVersion: 3,
  schemaVersionName: "Production",
  bookmarkId: 5,
  bookmarkName: "Stable",
  createdByName: "Ada Lovelace",
  createdByEmail: "ada@example.com",
  ...overrides,
});

describe("organization inference catalog", () => {
  test("scopes cached catalog data to the active organization", () => {
    expect(INFERENCES_QUERY_KEY(42)).toEqual(["org", 42, "inferences"]);
    expect(INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY(42, 11)).toEqual([
      "org",
      42,
      "inferenceReviewAssignments",
      11,
    ]);
  });

  test("invalidates every visible prediction-run collection after creation", async () => {
    const queryClient = new QueryClient();
    const catalogKey = INFERENCES_QUERY_KEY(42);
    const launcherKey = ORGANIZATION_BOOKMARKS_QUERY_KEY(42);
    queryClient.setQueryData(catalogKey, [inference()]);
    queryClient.setQueryData(launcherKey, []);

    await invalidatePredictionRunCollections(queryClient, 42);

    expect(queryClient.getQueryState(catalogKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(launcherKey)?.isInvalidated).toBe(true);

    const manualCreation = readFileSync(
      new URL("../src/features/schemas/api/schema-prediction-mutations.ts", import.meta.url),
      "utf8",
    );
    const bulkCreation = readFileSync(
      new URL("../src/features/schemas/lib/use-schema-run-bulk-upload.ts", import.meta.url),
      "utf8",
    );
    expect(manualCreation).toContain("invalidatePredictionRunCollections(qc");
    expect(bulkCreation).toContain("invalidatePredictionRunCollections(queryClient");
  });

  test("keeps review candidates grouped by schema snapshot", () => {
    const groups = groupReviewCandidates([
      {
        runId: "11",
        name: "First",
        createdAt: "2026-07-22T08:00:00Z",
        schemaId: "2",
        versionId: "7",
        groupLabel: "Risk · Production",
      },
      {
        runId: "12",
        name: "Second",
        createdAt: "2026-07-22T08:02:00Z",
        schemaId: "3",
        versionId: "8",
        groupLabel: "Support · Production",
      },
    ]);

    expect(groups.map((group) => group.candidates.map((item) => item.runId))).toEqual([
      ["11"],
      ["12"],
    ]);
  });

  test("keeps catalog actions on the page and previews rows beside the table", () => {
    const page = readFileSync(
      new URL("../src/features/inferences/pages/inferences-page.tsx", import.meta.url),
      "utf8",
    );
    const routePage = readFileSync(
      new URL("../src/app/pages/InferencesRoutePage.tsx", import.meta.url),
      "utf8",
    );
    const exportAction = readFileSync(
      new URL(
        "../src/features/schemas/components/OrganizationInferenceExportDialog.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(page).toContain("<ReviewCreationButton");
    expect(page).toContain("renderExportAction?.(visibleItems)");
    expect(page).toContain("<InferenceActionsMenu");
    expect(page).toContain("?tab=reviews&section=reviews");
    expect(page).toContain("<InferencePreviewSheet");
    expect(routePage).toContain("<OrganizationInferenceExportButton");
    expect(routePage).toContain("<PredictionRunDetails");
    expect(exportAction).toContain("predictionRunQueryOptions");
    expect(exportAction).toContain("<SchemaRunExportDialog");
  });

  test("exposes reviewer status and explicit completed-submission reopening", () => {
    const menu = readFileSync(
      new URL("../src/features/inferences/components/InferenceActionsMenu.tsx", import.meta.url),
      "utf8",
    );
    const section = readFileSync(
      new URL(
        "../src/features/inferences/components/InferenceReviewStatusSection.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const actions = readFileSync(
      new URL("../src/features/inferences/lib/use-review-assignment-actions.tsx", import.meta.url),
      "utf8",
    );
    const mutations = readFileSync(
      new URL("../src/features/inferences/api/inference-mutations.ts", import.meta.url),
      "utf8",
    );

    expect(menu).toContain("Review status");
    expect(actions).toContain('assignment.reviewState === "COMPLETED"');
    expect(actions).toContain("Their saved answers will be kept.");
    expect(section).toContain("No review includes this inference.");
    expect(mutations).toContain("/reviewers/${reviewerId}/reopen");
  });

  test("registers catalog and canonical detail as protected Inferences destinations", () => {
    const routes = readFileSync(
      new URL("../src/app/router/protected-routes.ts", import.meta.url),
      "utf8",
    );
    const sidebar = readFileSync(
      new URL("../src/app/components/use-navigation-items.ts", import.meta.url),
      "utf8",
    );

    expect(routes).toContain('page("inferences", ');
    expect(routes).toContain('page("inferences/:inferenceId", ');
    expect(routes).toContain('import("@/app/pages/InferencesRoutePage")');
    expect(routes).toContain('import("@/app/pages/InferenceDetailRoutePage")');
    expect(sidebar).toContain('to: "/inferences"');
    expect(sidebar).toContain('label: "Inferences"');
  });

  test("renders reviews as one inline detail section with deep-link and failure states", () => {
    const detail = readFileSync(
      new URL("../src/features/inferences/pages/inference-detail-page.tsx", import.meta.url),
      "utf8",
    );
    const removedDialog = new URL(
      "../src/features/inferences/components/InferenceReviewStatusDialog.tsx",
      import.meta.url,
    );

    expect(detail).toContain('searchParams.get("section") === "reviews"');
    expect(detail).toContain('getElementById("reviews")?.scrollIntoView()');
    expect(detail).toContain("<InferenceReviewStatusSection");
    expect(detail).toContain("Loading inference…");
    expect(detail).toContain("Inference unavailable");
    expect(detail).toContain("Review management unavailable");
    expect(detail).not.toContain("AppTabs");
    expect(existsSync(removedDialog)).toBe(false);
  });

  test("uses independently paginated catalogs for review creation", () => {
    const dialog = readFileSync(
      new URL("../src/capabilities/review-creation/ReviewCreationDialog.tsx", import.meta.url),
      "utf8",
    );
    const catalog = readFileSync(
      new URL("../src/capabilities/review-creation/ReviewSelectionCatalog.tsx", import.meta.url),
      "utf8",
    );
    const api = readFileSync(
      new URL("../src/capabilities/review-creation/review-creation-api.ts", import.meta.url),
      "utf8",
    );

    expect(dialog.match(/<ReviewSelectionCatalog/g)).toHaveLength(2);
    expect(dialog).toContain('title="Inferences"');
    expect(dialog).toContain('title="Reviewers"');
    expect(catalog).toContain("<CatalogPaginationFooter");
    expect(catalog).toContain("<AppTextField");
    expect(catalog).toContain("selectedIds");
    expect(dialog).toContain("const schemaId = Number(group.schemaId)");
    expect(api).toContain("request: CreateSchemaReviewRequest");
  });

  test("renders paginated review tiles with reopen and delete response actions", () => {
    const section = readFileSync(
      new URL(
        "../src/features/inferences/components/InferenceReviewStatusSection.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const actions = readFileSync(
      new URL("../src/features/inferences/lib/use-review-assignment-actions.tsx", import.meta.url),
      "utf8",
    );
    const mutations = readFileSync(
      new URL("../src/features/inferences/api/inference-mutations.ts", import.meta.url),
      "utf8",
    );

    expect(section).toContain("<InferenceReviewTile");
    expect(section).toContain("<CatalogListPanel");
    expect(actions).toContain("Reopen");
    expect(actions).toContain("Delete response");
    expect(mutations).toContain("/response`");
  });
});
