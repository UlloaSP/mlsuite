/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { OrganizationLogoSettings } from "@/features/workspace/components/OrganizationLogoSettings";
import { click, mount } from "./support/dom";
import type { OrganizationDto } from "@/shared/api/openapi.gen";

const hooks = vi.hoisted(() => ({ remove: vi.fn(), replace: vi.fn() }));
vi.mock("@/features/workspace/api/workspace.mutations", () => ({
  useRemoveOrganizationLogoMutation: hooks.remove,
  useReplaceOrganizationLogoMutation: hooks.replace,
}));

const organization = (logoUrl: string | null): OrganizationDto => ({
  id: 7,
  name: "Acme",
  slug: "acme",
  description: null,
  logoUrl,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

const mutation = (patch = {}) => ({
  error: null,
  isError: false,
  isPending: false,
  isSuccess: false,
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  ...patch,
});

const logo = (host: ParentNode) =>
  host.querySelector<HTMLImageElement>("img[data-organization-logo]");
const removeButton = (host: ParentNode) =>
  [...host.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Remove logo",
  );

async function choose(host: ParentNode, file: File) {
  const input = host.querySelector<HTMLInputElement>('input[aria-label="Choose a logo"]')!;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
}

describe("organization logo settings", () => {
  afterEach(() => vi.clearAllMocks());

  test("without a logo the icon stands in and there is nothing to remove", async () => {
    hooks.replace.mockReturnValue(mutation());
    hooks.remove.mockReturnValue(mutation());

    const { host } = await mount(<OrganizationLogoSettings organization={organization(null)} />);

    expect(host.textContent).toContain("Logo");
    expect(host.textContent).toContain("PNG or JPG");
    expect(logo(host)).toBeNull();
    expect(removeButton(host)).toBeUndefined();
  });

  test("a chosen picture is sent to replace the logo", async () => {
    const replace = vi.fn();
    hooks.replace.mockReturnValue(mutation({ mutate: replace }));
    hooks.remove.mockReturnValue(mutation());
    const file = new File([new Uint8Array([137, 80, 78, 71])], "acme.png", { type: "image/png" });

    const { host } = await mount(<OrganizationLogoSettings organization={organization(null)} />);
    await choose(host, file);

    expect(replace).toHaveBeenCalledExactlyOnceWith({ organizationId: 7, file });
  });

  test("the stored logo is shown from its public address and can be removed", async () => {
    const remove = vi.fn();
    hooks.replace.mockReturnValue(mutation());
    hooks.remove.mockReturnValue(mutation({ mutate: remove }));

    const { host } = await mount(
      <OrganizationLogoSettings
        organization={organization("/api/public/organizations/7/logo?v=5")}
      />,
    );

    expect(logo(host)?.src).toBe(`${window.location.origin}/api/public/organizations/7/logo?v=5`);
    await click(removeButton(host)!);
    expect(remove).toHaveBeenCalledExactlyOnceWith(7);
  });

  test("a refused picture is explained and a saved one confirmed", async () => {
    hooks.replace.mockReturnValue(
      mutation({ error: new Error("Upload a PNG or JPG image."), isError: true }),
    );
    hooks.remove.mockReturnValue(mutation());
    const { host, rerender } = await mount(
      <OrganizationLogoSettings organization={organization(null)} />,
    );
    expect(host.textContent).toContain("Upload a PNG or JPG image.");

    hooks.replace.mockReturnValue(mutation({ isSuccess: true }));
    await rerender(
      <OrganizationLogoSettings
        organization={organization("/api/public/organizations/7/logo?v=6")}
      />,
    );
    expect(host.querySelector('[role="status"]')?.textContent).toBe("Logo updated.");
    expect(host.textContent).not.toContain("Upload a PNG or JPG image.");
  });
});
