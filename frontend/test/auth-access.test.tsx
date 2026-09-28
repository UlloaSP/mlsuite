// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { useLocation } from "react-router";
import { greetingFor } from "@/app/pages/auth-landing/authLandingCopy";
import { useAuthAccess } from "@/app/pages/auth-landing/useAuthAccess";
import { click, mount } from "./support/dom";

let host: HTMLDivElement;

function AccessProbe() {
  const location = useLocation();
  const access = useAuthAccess("/review");
  return (
    <div data-phase={access.phase} data-path={location.pathname}>
      <button type="button" onClick={() => access.start(null)}>
        start
      </button>
      <button type="button" onClick={access.succeed}>
        succeed
      </button>
      <button type="button" onClick={access.fail}>
        fail
      </button>
    </div>
  );
}

const probe = () => host.querySelector<HTMLElement>("[data-phase]")!;
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(async () => {
  vi.useFakeTimers();
  ({ host } = await mount(<AccessProbe />, { route: "/" }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("auth access sequence", () => {
  test("tears the pass, reveals the overlay after the tear, then opens the destination", async () => {
    await click("start", host);
    expect(probe().dataset.phase).toBe("1");

    await click("succeed", host);
    advance(649);
    expect(probe().dataset.phase).toBe("1");
    advance(1);
    expect(probe().dataset.phase).toBe("2");
    expect(probe().dataset.path).toBe("/");

    advance(3000);
    expect(probe().dataset.path).toBe("/review");
  });

  test("returns the pass to idle after a failed request without navigating", async () => {
    await click("start", host);
    await click("fail", host);
    advance(650);

    expect(probe().dataset.phase).toBe("0");
    advance(5000);
    expect(probe().dataset.path).toBe("/");
  });
});

describe("auth pass greeting", () => {
  test.each([
    [0, "Hello,", "night owl."],
    [4, "Hello,", "night owl."],
    [5, "Good", "morning."],
    [12, "Good", "afternoon."],
    [19, "Good", "evening."],
    [22, "Hello,", "night owl."],
  ])("greets sign-in at %i:00 with %s %s", (hour, lead, emphasis) => {
    expect(greetingFor("login", new Date(2026, 8, 26, hour))).toEqual({ lead, emphasis });
  });

  test("welcomes new accounts regardless of the hour", () => {
    expect(greetingFor("register", new Date(2026, 8, 26, 23))).toEqual({
      lead: "Nice to",
      emphasis: "meet you.",
    });
  });
});
