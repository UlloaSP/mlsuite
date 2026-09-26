import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vite-plus/test";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { StartupGate } from "@/app/startup/StartupGate";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { EditorAssemblyLoader } from "@/shared/ui/EditorAssemblyLoader";
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

describe("application loading screen", () => {
  it("fills the viewport and follows the active semantic theme", () => {
    const markup = renderToStaticMarkup(<EditorAssemblyLoader scope="viewport" />);

    expect(markup).toContain('data-loading-scope="viewport"');
    expect(markup).toContain("h-svh");
    expect(markup).toContain("var(--accent-primary)");
    expect(markup).toContain("var(--page-bg)");
    expect(markup).toContain("app-loading-reveal");
    expect(markup).not.toContain("#FF385C");
    expect(markup).not.toContain("#F7F7F7");
    expect(markup).not.toContain("#050505");
    expect(markup).toContain("motion-reduce:hidden");
  });

  it("uses its parent height when mounted inside the application shell", () => {
    const markup = renderToStaticMarkup(<EditorAssemblyLoader />);

    expect(markup).toContain('data-loading-scope="container"');
    expect(markup).toContain("min-h-full");
    expect(markup).not.toContain("min-h-[460px]");
  });

  it("keeps startup and protected-route loading at viewport height", () => {
    const startup = renderToStaticMarkup(<StartupGate>Ready</StartupGate>);
    const protectedRoute = renderToStaticMarkup(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>,
    );

    expect(startup).toContain('class="startup-screen app-loading-reveal"');
    expect(protectedRoute).toContain('data-loading-scope="viewport"');
  });

  it("announces progress without rendering visible loading copy", () => {
    const markup = renderToStaticMarkup(<EditorAssemblyLoader label="Loading models" />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('class="sr-only"');
    expect(markup).toContain(">Loading models</span>");
  });

  it("uses the contained loader inside a page shell", () => {
    const markup = renderToStaticMarkup(<AppPageLoader label="Loading schema" />);

    expect(markup).toContain('data-loading-scope="container"');
    expect(markup).toContain('class="sr-only"');
    expect(markup).toContain(">Loading schema</span>");
  });

  it("offers a lightweight compact state for local requests", () => {
    const markup = renderToStaticMarkup(<AppLoadingState compact label="Loading members" />);

    expect(markup).toContain("min-h-16");
    expect(markup).toContain("app-loading-reveal");
    expect(markup).toContain('class="sr-only"');
    expect(markup).toContain(">Loading members</span>");
  });

  it("uses the visual loader for an empty catalog request", () => {
    const markup = renderToStaticMarkup(
      <CatalogListPanel
        emptyState={{ description: "No models", title: "Empty" }}
        errorMessage={null}
        hasNext={false}
        isBusy
        isLoading
        itemCount={0}
        loadingLabel="Loading models"
        page={0}
        setPage={() => undefined}
        totalPages={1}
      >
        {null}
      </CatalogListPanel>,
    );

    expect(markup).toContain('class="sr-only"');
    expect(markup).toContain(">Loading models</span>");
  });
});
