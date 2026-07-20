/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vite-plus/test";
import { createRoot, type Root } from "react-dom/client";
import { BundleDropZone } from "@/features/models/components/BundleDropZone";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: Root | null = null;

afterEach(() => {
  root?.unmount();
  root = null;
  document.body.innerHTML = "";
});

test("opens the file picker from the full drop zone", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  root.render(<BundleDropZone onFiles={vi.fn()} />);
  await flush();

  const dropZone = container.querySelector<HTMLElement>(".group");
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  const click = vi.spyOn(input!, "click");

  dropZone?.click();

  expect(click).toHaveBeenCalledOnce();
});
