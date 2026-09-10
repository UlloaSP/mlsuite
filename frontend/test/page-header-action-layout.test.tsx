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
  test("fills four equal slots right-first with alternating tones", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <AppPageHeader
          title="Actions"
          actionLayout="checkerboard"
          actions={
            <>
              <AppButton>First</AppButton>
              <AppButton>Second</AppButton>
              <AppButton>Third</AppButton>
              <AppButton>Fourth</AppButton>
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
    expect(slots.map((slot) => slot.dataset.tone)).toEqual([
      "primary",
      "secondary",
      "secondary",
      "primary",
    ]);
    expect(slots.every((slot) => slot.classList.contains("h-12"))).toBe(true);
    act(() => root.unmount());
  });
});
