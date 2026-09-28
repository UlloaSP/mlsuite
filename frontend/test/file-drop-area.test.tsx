// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { AppFileDropArea } from "@/shared/ui/AppFileDropArea";

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function render(onFiles: (files: File[]) => void) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <AppFileDropArea accept=".ts" inputLabel="Upload" label="Drop plugin files" onFiles={onFiles}>
        <p>No plugin files yet</p>
      </AppFileDropArea>,
    ),
  );
  return {
    area: container.querySelector<HTMLElement>('[role="button"][aria-label="Drop plugin files"]')!,
    input: container.querySelector<HTMLInputElement>('input[aria-label="Upload"]')!,
  };
}

test("an empty list accepts dropped files anywhere in its area", () => {
  const onFiles = vi.fn();
  const { area } = render(onFiles);
  const file = new File(["x"], "rating.ts");
  const drop = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(drop, "dataTransfer", { value: { files: [file] } });

  act(() => area.dispatchEvent(drop));

  expect(onFiles).toHaveBeenCalledWith([file]);
});

test("clicking or pressing Enter on the area opens the file browser", () => {
  const { area, input } = render(vi.fn());
  const browse = vi.spyOn(input, "click");

  act(() => area.click());
  act(() => area.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));

  expect(browse).toHaveBeenCalledTimes(2);
  expect(area.tabIndex).toBe(0);
});
