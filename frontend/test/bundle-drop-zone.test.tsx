/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { expect, test, vi } from "vite-plus/test";
import { BundleDropZone } from "@/features/models/components/BundleDropZone";
import { click, mount } from "./support/dom";

test("opens the file picker from the full drop zone", async () => {
  const { host } = await mount(<BundleDropZone onFiles={vi.fn()} />);

  const dropZone = host.querySelector<HTMLElement>(".group");
  const input = host.querySelector<HTMLInputElement>('input[type="file"]');
  const browse = vi.spyOn(input!, "click");

  await click(dropZone!);

  expect(browse).toHaveBeenCalledOnce();
});
