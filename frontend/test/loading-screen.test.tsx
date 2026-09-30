import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vite-plus/test";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { StartupGate } from "@/app/startup/StartupGate";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { AppSkeleton } from "@/shared/ui/AppSkeleton";
import { AppSkeletonScope } from "@/shared/ui/AppSkeletonScope";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";

vi.mock("@/app/startup/startup-query", () => ({
  useStartupReadinessQuery: () => ({ data: undefined }),
  useStartupServicesQuery: () => ({ data: undefined }),
}));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: undefined, error: null, isLoading: true }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({ data: undefined, error: null, isLoading: false }),
}));

const count = (markup: string, needle: string) => markup.split(needle).length - 1;

describe("loading skeletons", () => {
  it("draws skeleton blocks from theme tokens and respects reduced motion", () => {
    const markup = renderToStaticMarkup(<AppSkeleton className="h-4 w-12" />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("bg-surface-muted");
    expect(markup).toContain("motion-reduce:animate-none");
    expect(markup).toContain("h-4 w-12");
    expect(markup).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it("draws real children as a skeleton only while loading, announced outside the inert subtree", () => {
    const loading = renderToStaticMarkup(
      <AppSkeletonScope loading label="Loading inference…">
        <h2>Previous inference</h2>
      </AppSkeletonScope>,
    );
    const ready = renderToStaticMarkup(
      <AppSkeletonScope loading={false} label="Loading inference…">
        <h2>Current inference</h2>
      </AppSkeletonScope>,
    );

    expect(loading).toMatch(/^<span role="status" class="sr-only">Loading inference…<\/span><div/);
    expect(loading).toContain('data-skeleton=""');
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("inert");
    expect(ready).toBe('<div class="contents"><h2>Current inference</h2></div>');
  });

  it("announces a local request once and renders neutral skeleton rows", () => {
    const markup = renderToStaticMarkup(<AppLoadingState compact label="Loading members…" />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain(">Loading members…</span>");
    expect(markup).toContain("app-loading-reveal");
    expect(markup).not.toContain("bg-accent");
    expect(count(markup, "rounded-full")).toBe(2);
  });

  it("renders the requested number of catalog rows in the requested layout", () => {
    const markup = renderToStaticMarkup(
      <AppLoadingState label="Loading models…" layout="grid" rows={3} />,
    );

    expect(markup).toContain("md:grid-cols-2");
    expect(count(markup, "rounded-card")).toBe(3);
  });

  it("shapes a whole-page request like a page header and body", () => {
    const markup = renderToStaticMarkup(<AppPageLoader label="Loading schema…" />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain(">Loading schema…</span>");
    expect(markup).toContain("h-8 w-72");
    expect(count(markup, "rounded-card")).toBe(3);
  });

  it("shows the same viewport skeleton while checking readiness and loading the session", () => {
    const startup = renderToStaticMarkup(<StartupGate>Ready</StartupGate>);
    const protectedRoute = renderToStaticMarkup(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>,
    );

    expect(startup).toContain("h-svh");
    expect(startup).toContain(">Loading MLsuite…</span>");
    expect(startup).not.toContain("startup-screen");
    expect(protectedRoute).toContain("h-svh");
    expect(protectedRoute).toContain(">Loading workspace…</span>");
  });

  it("matches the catalog layout while an empty catalog loads", () => {
    const markup = renderToStaticMarkup(
      <CatalogListPanel
        emptyState={{ description: "No models", title: "Empty" }}
        errorMessage={null}
        hasNext={false}
        isBusy
        isLoading
        itemCount={0}
        layout="grid"
        loadingLabel="Loading models…"
        page={0}
        setPage={() => undefined}
        totalPages={1}
      >
        {null}
      </CatalogListPanel>,
    );

    expect(markup).toContain(">Loading models…</span>");
    expect(markup).toContain("md:grid-cols-2");
    expect(markup).not.toContain("Empty");
  });
});
