// @vitest-environment jsdom
import { act } from "react";
import { expect, test, vi } from "vite-plus/test";
import { AppFileDropArea } from "@/shared/ui/AppFileDropArea";
import { mount } from "./support/dom";

async function render(onFiles: (files: File[]) => void) {
  const { host } = await mount(
    <AppFileDropArea accept=".ts" inputLabel="Upload" label="Drop plugin files" onFiles={onFiles}>
      <p>No plugin files yet</p>
    </AppFileDropArea>,
  );
  return {
    area: host.querySelector<HTMLElement>('[role="button"][aria-label="Drop plugin files"]')!,
    input: host.querySelector<HTMLInputElement>('input[aria-label="Upload"]')!,
  };
}

test("an empty list accepts dropped files anywhere in its area", async () => {
  const onFiles = vi.fn();
  const { area } = await render(onFiles);
  const file = new File(["x"], "rating.ts");
  const drop = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(drop, "dataTransfer", { value: { files: [file] } });

  act(() => area.dispatchEvent(drop));

  expect(onFiles).toHaveBeenCalledWith([file]);
});

test("clicking or pressing Enter on the area opens the file browser", async () => {
  const { area, input } = await render(vi.fn());
  const browse = vi.spyOn(input, "click");

  act(() => area.click());
  act(() => area.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));

  expect(browse).toHaveBeenCalledTimes(2);
  expect(area.tabIndex).toBe(0);
});
