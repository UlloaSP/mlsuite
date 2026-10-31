// @vitest-environment jsdom
import { Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { HttpError } from "@/shared/api/http";
import { click, mount } from "./support/dom";

const refusal = (status: number) =>
  new HttpError({ timestamp: "2026-10-01T10:00:00Z", status, message: "Refused", path: "/api/x" });

const state = vi.hoisted(() => ({
  user: undefined as { data?: unknown; error?: unknown } | undefined,
  context: undefined as { data?: unknown; error?: unknown } | undefined,
  refetchContext: vi.fn(),
}));

vi.mock("@/capabilities/workspace-context/session", () => ({
  signInHref: (returnTo: string) => `/login?returnTo=${encodeURIComponent(returnTo)}`,
  useUser: () => ({ refetch: vi.fn(), ...state.user }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({ refetch: state.refetchContext, ...state.context }),
}));

beforeEach(() => {
  Object.assign(state, { user: { data: { id: 3 } }, context: { data: { permissions: {} } } });
  state.refetchContext.mockClear();
});

function Address() {
  return <p data-address="">{useLocation().search}</p>;
}

const openProtected = () =>
  mount(
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/models" element={<p>Models</p>} />
      </Route>
      <Route path="/login" element={<Address />} />
    </Routes>,
    { route: "/models" },
  );

describe("the protected shell", () => {
  test("an ended session goes to sign in and back", async () => {
    state.user = { error: refusal(401) };
    const { host } = await openProtected();

    expect(host.querySelector("[data-address]")?.textContent).toBe("?returnTo=%2Fmodels");
  });

  test("a context lost to an ended session goes to sign in too", async () => {
    state.context = { error: refusal(401) };
    const { host } = await openProtected();

    expect(host.querySelector("[data-address]")).not.toBeNull();
  });

  test.each([
    [500, "went wrong."],
    [403, "went wrong."],
    [0, "unavailable."],
  ])("a %i from the workspace context keeps the member signed in", async (status, headline) => {
    state.context = { error: refusal(status) };
    const { host } = await openProtected();

    expect(host.querySelector("[data-address]")).toBeNull();
    expect(host.querySelector("h1")?.textContent).toContain(headline);
    click(
      [...host.querySelectorAll("button")].find((button) => button.textContent === "Try again")!,
    );
    expect(state.refetchContext).toHaveBeenCalledTimes(1);
  });

  test("a failure refreshing a loaded session does not stop the page", async () => {
    state.user = { ...state.user, error: refusal(500) };
    const { host } = await openProtected();

    expect(host.textContent).toContain("Models");
  });
});
