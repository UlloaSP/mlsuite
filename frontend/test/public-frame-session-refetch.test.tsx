// @vitest-environment jsdom
import { focusManager } from "@tanstack/react-query";
import { act, useEffect } from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { SessionFrameLayout } from "@/app/layouts/SessionFrameLayout";
import { mount } from "./support/dom";

const profile = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/capabilities/workspace-context/session-api", async (original) => ({
  ...(await original<typeof import("@/capabilities/workspace-context/session-api")>()),
  getProfile: () => {
    profile.calls += 1;
    // As over the network: the answer takes a moment, during which the query is fetching.
    return new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("Unauthorized"), { status: 401 })), 20),
    );
  },
}));

const page = vi.hoisted(() => ({ mounts: 0 }));
function FormBeingFilled() {
  useEffect(() => {
    page.mounts += 1;
  }, []);
  return <input aria-label="Age" />;
}

const openPublicPage = () => {
  const root = createRootRoute();
  const frame = createRoute({
    getParentRoute: () => root,
    id: "session-frame",
    component: SessionFrameLayout,
  });
  const bookmark = createRoute({
    getParentRoute: () => frame,
    path: "/explore/$publicId",
    component: FormBeingFilled,
  });
  const router = createRouter({
    routeTree: root.addChildren([frame.addChildren([bookmark])]),
    history: createMemoryHistory({ initialEntries: ["/explore/some-bookmark"] }),
  });
  return mount(<RouterProvider router={router} />);
};

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

afterEach(() => {
  profile.calls = 0;
  page.mounts = 0;
  focusManager.setFocused(undefined);
});

describe("public frame of a visitor without a session", () => {
  test("coming back to the window asks for the session again without unmounting the page", async () => {
    const { host } = await openPublicPage();
    await settle();
    const input = host.querySelector<HTMLInputElement>('input[aria-label="Age"]')!;
    input.value = "40";

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    // While the session is asked for again, and once it has answered.
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));
    expect(input.isConnected).toBe(true);
    await settle();

    expect(profile.calls).toBe(2);
    expect(page.mounts).toBe(1);
    expect(input.isConnected).toBe(true);
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Age"]')?.value).toBe("40");
  });
});
