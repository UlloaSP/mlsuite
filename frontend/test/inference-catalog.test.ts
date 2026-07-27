import { existsSync, readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vite-plus/test";
import {
  INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY,
  INFERENCES_QUERY_KEY,
  type InferenceCatalogItemDto,
} from "@/features/inferences/api/inference-api";
import { filterInferences } from "@/features/inferences/lib/inference-filter";
import { groupReviewCandidates } from "@/capabilities/review-creation/review-creation-api";
import { invalidatePredictionRunCollections } from "@/features/schemas/api/schema-prediction-mutations";
import { BOOKMARK_PREDICTION_RUNS_QUERY_KEY } from "@/features/schemas/api/schema-keys";

const inference = (overrides: Partial<InferenceCatalogItemDto> = {}): InferenceCatalogItemDto => ({
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
    const historyKey = BOOKMARK_PREDICTION_RUNS_QUERY_KEY(42, "5");
    queryClient.setQueryData(catalogKey, [inference()]);
    queryClient.setQueryData(historyKey, []);

    await invalidatePredictionRunCollections(queryClient, 42, "5");

    expect(queryClient.getQueryState(catalogKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(historyKey)?.isInvalidated).toBe(true);

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

  test("combines search, schema, bookmark and status filters", () => {
    const items = [
      inference(),
      inference({ id: 12, schemaId: 3, schemaName: "Support", status: "FAILED" }),
    ];

    expect(
      filterInferences(items, {
        query: "fraud",
        schemaId: "2",
        bookmarkId: "5",
        status: "SUCCESS",
      }).map((item) => item.id),
    ).toEqual([11]);
  });

  test("handles filters with no matching inference", () => {
    expect(
      filterInferences([inference({ bookmarkId: null, bookmarkName: null })], {
        query: "",
        schemaId: "all",
        bookmarkId: "5",
        status: "all",
      }),
    ).toEqual([]);
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

  test("keeps catalog actions on the page and makes the full row the detail target", () => {
    const page = readFileSync(
      new URL("../src/features/inferences/pages/inferences-page.tsx", import.meta.url),
      "utf8",
    );
    const table = readFileSync(
      new URL("../src/features/inferences/components/InferenceCatalogTable.tsx", import.meta.url),
      "utf8",
    );

    expect(page).toContain("<ReviewCreationButton");
    expect(page).toContain("renderExportAction?.(filteredItems)");
    const routePage = readFileSync(
      new URL("../src/app/pages/InferencesRoutePage.tsx", import.meta.url),
      "utf8",
    );
    const exportAction = readFileSync(
      new URL(
        "../src/features/schemas/components/OrganizationInferenceExportButton.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(routePage).toContain("<OrganizationInferenceExportButton");
    expect(exportAction).toContain("predictionRunQueryOptions");
    expect(exportAction).toContain("<SchemaRunExportDialog");
    expect(table).toContain('role="link"');
    expect(table).toContain("<InferenceActionsMenu");
    expect(table).toContain("`/inferences/${item.id}`");
    expect(table).toContain("?section=reviews");
    expect(table).not.toContain(">View<");
    expect(table).not.toContain("useState");
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
    const tile = readFileSync(
      new URL("../src/features/inferences/components/InferenceReviewTile.tsx", import.meta.url),
      "utf8",
    );
    const mutations = readFileSync(
      new URL("../src/features/inferences/api/inference-mutations.ts", import.meta.url),
      "utf8",
    );

    expect(menu).toContain("Review status");
    expect(tile).toContain('assignment.reviewState === "COMPLETED"');
    expect(section).toContain("Their saved answers will be kept.");
    expect(section).toContain("Review status unavailable.");
    expect(section).toContain("No reviews include this inference.");
    expect(mutations).toContain("/reviewers/${reviewerId}/reopen");
  });

  test("registers catalog and canonical detail as protected Inferences destinations", () => {
    const routes = readFileSync(
      new URL("../src/app/router/inference-routes.ts", import.meta.url),
      "utf8",
    );
    const sidebar = readFileSync(
      new URL("../src/app/components/SidebarNavigation.tsx", import.meta.url),
      "utf8",
    );

    expect(routes).toContain('path: "inferences"');
    expect(routes).toContain('path: "inferences/:inferenceId"');
    expect(routes).toContain('import("@/app/pages/InferencesRoutePage")');
    expect(routes).toContain('import("@/features/inferences/pages/inference-detail-page")');
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
    expect(detail).toContain("Loading inference...");
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
    expect(api).toContain("schemaId: number");
  });

  test("renders paginated review tiles with reopen and delete response actions", () => {
    const section = readFileSync(
      new URL(
        "../src/features/inferences/components/InferenceReviewStatusSection.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const tile = readFileSync(
      new URL("../src/features/inferences/components/InferenceReviewTile.tsx", import.meta.url),
      "utf8",
    );
    const mutations = readFileSync(
      new URL("../src/features/inferences/api/inference-mutations.ts", import.meta.url),
      "utf8",
    );

    expect(section).toContain("<InferenceReviewTile");
    expect(section).toContain("<CatalogPaginationFooter");
    expect(tile).toContain("Reopen");
    expect(tile).toContain("Delete response");
    expect(mutations).toContain("/response`");
  });
});
