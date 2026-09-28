// @vitest-environment jsdom

import { useState } from "react";
import { describe, expect, it } from "vite-plus/test";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";
import { AppCheckMark } from "@/shared/ui/AppCheckMark";
import { click, mount } from "./support/dom";

function Harness() {
  const [checked, setChecked] = useState(false);
  return (
    <AppCheckbox aria-label="Include run" checked={checked} onChange={() => setChecked(!checked)} />
  );
}

describe("checkboxes", () => {
  it("keeps a real, labelled checkbox that toggles", async () => {
    const { host } = await mount(<Harness />);

    const input = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(input.getAttribute("aria-label")).toBe("Include run");
    await click(input);
    expect(input.checked).toBe(true);
  });

  it("hides the decorative mark from assistive tech", async () => {
    const { host } = await mount(<AppCheckMark checked />);

    expect(host.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelector("svg")).not.toBeNull();
  });
});
