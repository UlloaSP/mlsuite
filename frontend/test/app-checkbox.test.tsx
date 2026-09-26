// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vite-plus/test";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";
import { AppCheckMark } from "@/shared/ui/AppCheckMark";

function Harness() {
  const [checked, setChecked] = useState(false);
  return (
    <AppCheckbox aria-label="Include run" checked={checked} onChange={() => setChecked(!checked)} />
  );
}

describe("checkboxes", () => {
  it("keeps a real, labelled checkbox that toggles", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(<Harness />));

    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(input.getAttribute("aria-label")).toBe("Include run");
    act(() => input.click());
    expect(input.checked).toBe(true);
    act(() => root.unmount());
  });

  it("hides the decorative mark from assistive tech", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(<AppCheckMark checked />));

    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg")).not.toBeNull();
    act(() => root.unmount());
  });
});
