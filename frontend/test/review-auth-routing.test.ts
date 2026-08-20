import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";
import { safeReturnTo } from "@/capabilities/workspace-context/session";
import { reviewRoutes } from "@/app/router/review-routes";

describe("integrated review authentication and routes", () => {
  test("keeps one fixed login/register page without external-review injection seams", () => {
    const page = readFileSync(
      new URL("../src/app/pages/AuthLandingPage.tsx", import.meta.url),
      "utf8",
    );
    const form = readFileSync(
      new URL("../src/app/pages/auth-landing/AuthFormPanel.tsx", import.meta.url),
      "utf8",
    );

    expect(page).not.toMatch(/defaultMode|availableModes|onLogin|onRegister/);
    expect(page).not.toContain("AuthOptions");
    expect(form).not.toMatch(/BackButton|modes: readonly|role="tablist"/);
  });

  test("opens every review route as the direct rail workspace", () => {
    const page = readFileSync(
      new URL("../src/features/reviews/pages/reviews-page.tsx", import.meta.url),
      "utf8",
    );
    const routes = readFileSync(
      new URL("../src/app/router/review-routes.ts", import.meta.url),
      "utf8",
    );

    expect(page).toContain("SchemaReviewRunRail");
    expect(page).not.toContain("ReviewCatalogCard");
    expect(routes).not.toContain("review-workspace-page");
  });

  test("keeps local review destinations after authentication", () => {
    expect(safeReturnTo("/review/review-1/runs/run-1")).toBe("/review/review-1/runs/run-1");
    expect(reviewRoutes.map((route) => route.path)).toEqual([
      "review",
      "review/:reviewId",
      "review/:reviewId/runs/:reviewRunId",
    ]);
  });

  test("recomputes the authorized landing page after switching organizations", () => {
    const organizationHeader = readFileSync(
      new URL("../src/app/components/SidebarOrganizationHeader.tsx", import.meta.url),
      "utf8",
    );
    const authenticatedHome = readFileSync(
      new URL("../src/app/pages/authenticated-home-page.tsx", import.meta.url),
      "utf8",
    );

    expect(organizationHeader).toMatch(
      /mutateAsync\(organization\.id\)\.then\(\(\) => \{\s+void navigate\("\/home"\);/,
    );
    expect(organizationHeader).not.toContain('navigate("/workspace")');
    expect(authenticatedHome).toContain("permissions?.canViewWorkspace");
    expect(authenticatedHome).toContain("permissions?.canReview || permissions?.canManageReviews");
    expect(authenticatedHome).toContain('<Navigate to="/review" replace />');
  });

  test.each(["https://evil.example/review", "//evil.example/review", "/\\evil", null])(
    "rejects unsafe return destination %s",
    (destination) => {
      expect(safeReturnTo(destination)).toBe("/home");
    },
  );
});
