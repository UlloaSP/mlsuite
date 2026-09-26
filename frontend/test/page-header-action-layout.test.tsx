/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, test } from "vite-plus/test";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPageHeader } from "@/shared/ui/PageHeader";

describe("page header checkerboard actions", () => {
  test("fills four equal slots right-first and keeps each action's own variant", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <AppPageHeader
          title="Actions"
          actionLayout="checkerboard"
          actions={
            <>
              <AppButton variant="secondary">First</AppButton>
              <AppButton>Second</AppButton>
              <AppButton variant="secondary">Third</AppButton>
              <AppButton variant="danger">Fourth</AppButton>
            </>
          }
        />,
      );
    });

    const slots = Array.from(container.querySelectorAll<HTMLElement>("[data-page-header-action]"));
    expect(slots.map((slot) => slot.dataset.pageHeaderAction)).toEqual([
      "top-right",
      "top-left",
      "bottom-right",
      "bottom-left",
    ]);
    // Position never restyles an action: a secondary action placed first stays secondary.
    const [first, second, , fourth] = slots.map((slot) => slot.querySelector("button")!);
    expect(first.className).toContain("border-line");
    expect(first.className).not.toContain("bg-accent");
    expect(second.className).toContain("bg-accent");
    expect(fourth.className).toContain("text-danger-fg");
    expect(slots.some((slot) => /[&_button]:bg-/.test(slot.className))).toBe(false);
    expect(slots.every((slot) => slot.classList.contains("h-12"))).toBe(true);
    act(() => root.unmount());
  });
});
