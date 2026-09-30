/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { DropdownMenu } from "radix-ui";
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

test("a long trail keeps the root and the last levels and folds the middle into a menu", async () => {
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

test("pages start at the root of their scope, which links home and opens its switcher", async () => {
  const roots = {
    organization: {
      label: "Acme",
      to: "/workspace",
      menuLabel: "Switch organization",
      menu: (
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Item>Globex</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      ),
    },
    account: { label: "Ada Lovelace", to: "/profile" },
  };
  const nav = await render(
    <BreadcrumbProvider roots={roots}>
      <AppPageHeader title="Models" breadcrumbs={[{ label: "Models" }]} />
    </BreadcrumbProvider>,
  );

  const rootLink = nav.querySelector("a")!;
  expect(rootLink.textContent).toBe("Acme");
  expect(rootLink.getAttribute("href")).toBe("/workspace");
  expect(nav.querySelector('[aria-label="Switch organization"]')).not.toBeNull();
  expect(nav.textContent).toContain("Models");

  const accountNav = await render(
    <BreadcrumbProvider roots={roots}>
      <AppPageHeader
        title="Settings"
        breadcrumbScope="account"
        breadcrumbs={[{ label: "Settings" }]}
      />
    </BreadcrumbProvider>,
  );
  expect(accountNav.querySelector("a")?.getAttribute("href")).toBe("/profile");
});

test("every page has a trail: its title when it declares no levels, just the root on a home page", async () => {
  const roots = { organization: { label: "Acme", to: "/workspace" } };
  const titled = await render(
    <BreadcrumbProvider roots={roots}>
      <AppPageHeader title="Inferences" />
    </BreadcrumbProvider>,
  );
  expect(titled.textContent).toBe("AcmeInferences");
  expect(titled.querySelector('[aria-current="page"]')?.textContent).toBe("Inferences");

  const home = await render(
    <BreadcrumbProvider roots={roots}>
      <AppPageHeader title={<span>Acme workspace</span>} />
    </BreadcrumbProvider>,
  );
  expect(home.textContent).toBe("Acme");
  expect(home.querySelector('[aria-current="page"]')?.textContent).toBe("Acme");

  // The workspace home is titled with the organization's name: it is the root, not "Acme › Acme".
  const named = await render(
    <BreadcrumbProvider roots={roots}>
      <AppPageHeader title="Acme" />
    </BreadcrumbProvider>,
  );
  expect(named.textContent).toBe("Acme");
});
