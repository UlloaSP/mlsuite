/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { describe, expect, test, vi } from "vite-plus/test";
import { PublicBookmarkCard } from "@/capabilities/public-bookmarks/PublicBookmarkCard";
import { MemberTable } from "@/features/workspace/components/MemberTable";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { mount } from "./support/dom";
import type { PublicBookmarkSummaryDto } from "@/shared/api/openapi.gen";

const bookmark = (name: string, publisherHandle: string | null = "ada") =>
  ({
    publicId: `id-${name}`,
    name,
    description: null,
    inputCount: 1,
    reportCount: 1,
    organizationName: "Ada Lovelace",
    organizationLogoUrl: null,
    organizationKind: "PERSONAL",
    publisherHandle,
    updatedAt: "2026-10-01T10:00:00Z",
  }) satisfies PublicBookmarkSummaryDto;

describe("where a person appears", () => {
  test("an avatar is read from the API, and initials stand in for one", async () => {
    const { host, rerender } = await mount(
      <PersonAvatar
        avatarUrl="/api/public/users/7/avatar?v=1"
        className="size-8"
        name="Ada King"
      />,
    );

    expect(host.querySelector("img")?.src).toContain("/api/public/users/7/avatar?v=1");

    await rerender(<PersonAvatar avatarUrl={null} className="size-8" name="Ada King" />);
    expect(host.textContent).toBe("AK");
    expect(host.querySelector("img")).toBeNull();
  });

  test("a card links to its publisher only while their profile is visible", async () => {
    const { host, rerender } = await mount(<PublicBookmarkCard bookmark={bookmark("shown")} />, {
      route: "/explore",
    });

    expect(host.querySelector('a[href="/u/ada"]')?.textContent).toBe("Ada Lovelace");
    expect(host.querySelector("a a")).toBeNull();

    await rerender(<PublicBookmarkCard bookmark={bookmark("shown", null)} />);
    expect(host.querySelector('a[href="/u/ada"]')).toBeNull();
    expect(host.textContent).toContain("Ada Lovelace");
  });

  test("a member links to their profile only while it is visible", async () => {
    const row = {
      id: 1,
      fullName: "Ada Lovelace",
      email: "ada@example.test",
      avatarUrl: null,
      status: "ACTIVE",
      role: { id: 2, name: "Owner" },
      actions: { canChangeRole: false, canRemove: false },
    } as const;
    const { host, rerender } = await mount(
      <MemberTable
        organizationId={3}
        rows={[{ ...row, profileHandle: "ada" } as never]}
        onRemove={vi.fn()}
        onRoleChange={vi.fn()}
      />,
      { route: "/members" },
    );

    expect(host.querySelector('a[href="/u/ada"]')?.textContent).toBe("@ada");

    await rerender(
      <MemberTable
        organizationId={3}
        rows={[{ ...row, profileHandle: null } as never]}
        onRemove={vi.fn()}
        onRoleChange={vi.fn()}
      />,
    );
    expect(host.querySelector("a")).toBeNull();
  });
});
