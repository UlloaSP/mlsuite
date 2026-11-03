// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { safeReturnTo } from "@/capabilities/workspace-context/session";
import { canManageReviewsRoute, reviewAccessRoute } from "@/app/router/layout-routes";
import { QueryClient } from "@tanstack/react-query";
import { createAppRouter } from "@/app/router/routes";

const router = createAppRouter(new QueryClient());

describe("integrated review authentication and routes", () => {
  test("keeps one fixed login/register page without external-review injection seams", () => {
    const page = readFileSync(
      resolve(import.meta.dirname, "../src/app/pages/AuthLandingPage.tsx"),
      "utf8",
    );
    const form = readFileSync(
      resolve(import.meta.dirname, "../src/app/pages/auth-landing/AuthFormPanel.tsx"),
      "utf8",
    );

    expect(page).not.toMatch(/defaultMode|availableModes|onLogin|onRegister/);
    expect(page).not.toContain("AuthOptions");
    expect(form).not.toMatch(/BackButton|modes: readonly|role="tablist"/);
  });

  test("opens every review route as the direct rail workspace", () => {
    const page = readFileSync(
      resolve(import.meta.dirname, "../src/features/reviews/pages/reviews-page.tsx"),
      "utf8",
    );
    const routes = readFileSync(
      resolve(import.meta.dirname, "../src/app/router/protected-routes.ts"),
      "utf8",
    );

    expect(page).toContain("SchemaReviewRunRail");
    expect(page).not.toContain("ReviewCatalogCard");
    expect(routes).not.toContain("review-workspace-page");
  });

  test("keeps local review destinations after authentication", () => {
    expect(safeReturnTo("/review/review-1/runs/run-1", "/explore")).toBe(
      "/review/review-1/runs/run-1",
    );
    const reviewPaths = Object.keys(router.routesByPath).filter((path) =>
      path.startsWith("/review"),
    );
    expect(reviewPaths.sort()).toEqual([
      "/review",
      "/review/$reviewId",
      "/review/$reviewId/runs/$reviewRunId",
      "/review/manage",
    ]);
    const pages = router.routesByPath;
    for (const path of ["/review", "/review/$reviewId", "/review/$reviewId/runs/$reviewRunId"]) {
      expect(pages[path as keyof typeof pages].parentRoute).toBe(reviewAccessRoute);
    }
    expect(pages["/review/manage"].parentRoute).toBe(canManageReviewsRoute);
  });

  test("recomputes the authorized landing page after switching organizations", () => {
    const organizationHeader = readFileSync(
      resolve(import.meta.dirname, "../src/app/components/OrganizationMenuContent.tsx"),
      "utf8",
    );
    const authenticatedHome = readFileSync(
      resolve(import.meta.dirname, "../src/app/pages/authenticated-home-page.tsx"),
      "utf8",
    );

    expect(organizationHeader).toMatch(
      /mutateAsync\(organization\.id\)\.then\(\(\) => \{\s*void navigate\(\{ to: "\/home" \}\);/,
    );
    expect(organizationHeader).not.toContain('to: "/workspace"');
    expect(authenticatedHome).toContain("permissions?.canViewWorkspace");
    expect(authenticatedHome).toContain("permissions?.canReview || permissions?.canManageReviews");
    expect(authenticatedHome).toContain('<Navigate to="/review" replace />');
  });

  test.each(["https://evil.example/review", "//evil.example/review", "/\\evil", null])(
    "rejects unsafe return destination %s",
    (destination) => {
      expect(safeReturnTo(destination, "/explore")).toBe("/explore");
    },
  );
});
