// @vitest-environment jsdom
import { focusManager } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { Route, Routes } from "react-router";
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

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

afterEach(() => {
  profile.calls = 0;
  page.mounts = 0;
  focusManager.setFocused(undefined);
});

describe("public frame of a visitor without a session", () => {
  test("coming back to the window asks for the session again without unmounting the page", async () => {
    const { host } = await mount(
      <Routes>
        <Route element={<SessionFrameLayout />}>
          <Route path="/explore/:publicId" element={<FormBeingFilled />} />
        </Route>
      </Routes>,
      { route: "/explore/some-bookmark" },
    );
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
