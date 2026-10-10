/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { expect, test } from "vite-plus/test";
import { AppBreadcrumbs, type AppBreadcrumbItem } from "@/shared/ui/AppBreadcrumbs";
import { BreadcrumbProvider } from "@/shared/ui/breadcrumb/BreadcrumbProvider";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { mount } from "./support/dom";

async function render(node: React.ReactNode) {
  const { host } = await mount(node, { route: "/" });
  return host.querySelector<HTMLElement>('nav[aria-label="Breadcrumb"]')!;
}

const trail: AppBreadcrumbItem[] = [
  { label: "Acme", to: "/workspace" },
  { label: "Schemas", to: "/schemas" },
  { label: "Risk schema", to: "/schemas/schema-1" },
  { label: "Bookmarks", to: "/schemas/schema-1/bookmarks" },
  { label: "Risk bookmark", to: "/schemas/schema-1/bookmarks/bookmark-1" },
  { label: "New inference" },
];

test("a short trail shows every level", async () => {
  const nav = await render(<AppBreadcrumbs items={trail.slice(0, 5)} />);
  expect(nav.textContent).toBe("AcmeSchemasRisk schemaBookmarksRisk bookmark");
  expect(nav.querySelector('[aria-label^="Show"]')).toBeNull();
});

test("a long trail keeps the first and the last levels and folds the middle into a menu", async () => {
  const nav = await render(<AppBreadcrumbs items={trail} />);
  expect(nav.textContent).toBe("AcmeBookmarksRisk bookmarkNew inference");
  const more = nav.querySelector<HTMLButtonElement>('[aria-label="Show 2 more levels"]')!;
  expect(more).not.toBeNull();

  await act(async () => {
    more.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  });
  const hidden = [...document.body.querySelectorAll('[role="menuitem"]')].map((item) => [
    item.textContent,
    item.getAttribute("href"),
  ]);
  expect(hidden).toEqual([
    ["Schemas", "/schemas"],
    ["Risk schema", "/schemas/schema-1"],
  ]);
});

test("a trail starts at the section, never at the organization, and one level is no trail", async () => {
  const section = await render(
    <BreadcrumbProvider>
      <AppPageHeader title="Models" breadcrumbs={[{ label: "Models" }]} />
    </BreadcrumbProvider>,
  );
  expect(section).toBeNull();

  const untitled = await render(
    <BreadcrumbProvider>
      <AppPageHeader title="Inferences" />
    </BreadcrumbProvider>,
  );
  expect(untitled).toBeNull();

  const detail = await render(
    <BreadcrumbProvider>
      <AppPageHeader
        title="Risk model"
        breadcrumbs={[{ label: "Models", to: "/models" }, { label: "Risk model" }]}
      />
    </BreadcrumbProvider>,
  );
  expect(detail.textContent).toBe("ModelsRisk model");
  expect(detail.querySelector("a")?.getAttribute("href")).toBe("/models");
  expect(detail.querySelector('[aria-current="page"]')?.textContent).toBe("Risk model");
});
