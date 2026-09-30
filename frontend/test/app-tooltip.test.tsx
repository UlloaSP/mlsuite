// @vitest-environment jsdom

import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { AppTooltip } from "@/shared/ui/AppTooltip";
import { mount } from "./support/dom";

describe("AppTooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const focusTrigger = (host: HTMLElement) =>
    act(() => {
      host.querySelector("button")!.focus();
      vi.advanceTimersByTime(500);
    });

  it("names an icon control with its shortcut on keyboard focus", async () => {
    const { host } = await mount(
      <AppTooltip label="Global search" shortcut="Control+K Meta+K">
        <button type="button" aria-label="Global search" />
      </AppTooltip>,
    );
    focusTrigger(host);

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain("Global search");
    expect([...document.body.querySelectorAll("kbd")].map((kbd) => kbd.textContent)).toEqual(
      expect.arrayContaining(["K"]),
    );
  });

  it("stays closed while disabled", async () => {
    const { host } = await mount(
      <AppTooltip label="Models" disabled>
        <button type="button">Models</button>
      </AppTooltip>,
    );
    focusTrigger(host);

    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
  });
});
