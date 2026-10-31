/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { OwnProfilePage } from "@/features/user/pages/own-profile-page";
import { PublicProfilePage } from "@/features/user/pages/public-profile-page";
import { buttonByText, changeValue, click, mount } from "./support/dom";
import type {
  OwnProfileDto,
  PublicBookmarkSummaryDto,
  PublicProfileDto,
  UserDto,
} from "@/shared/api/openapi.gen";

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

const PROFILE: PublicProfileDto = {
  handle: "ada",
  fullName: "Ada Lovelace",
  avatarUrl: null,
  bio: "First line\nSecond line",
  location: "London",
  website: "https://ada.example/",
  company: "Analytical Engines",
  links: ["https://notes.example/ada"],
  joinedAt: "2026-01-15T10:00:00Z",
  pinned: [bookmark("pinned")],
  organizations: [{ name: "Royal Society", logoUrl: null }],
};

const USER: UserDto = {
  id: 7,
  userName: "ada",
  email: "ada@example.test",
  fullName: "Ada Lovelace",
  avatarUrl: null,
  systemRole: "USER",
  enabled: true,
  createdAt: "Jan, 2026",
  bio: PROFILE.bio,
  location: PROFILE.location,
  website: PROFILE.website,
  company: PROFILE.company,
  links: PROFILE.links,
  profilePublic: true,
  profileShowsOrganizations: true,
};

const OWN: OwnProfileDto = { profile: PROFILE, models: 3, schemas: 2, plugins: 1, inferences: 40 };
const PAGE = (...items: PublicBookmarkSummaryDto[]) => ({
  items,
  page: 0,
  size: 24,
  totalItems: items.length,
  hasNext: false,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const routes = new Map<string, () => Response>();
let fetchMock: ReturnType<typeof vi.fn>;

const requests = (method: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({
      path: new URL(String(url), "http://api.test").pathname,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
    }));

beforeEach(() => {
  routes.clear();
  routes.set("/api/users/me", () => json(USER));
  routes.set("/api/users/me/profile", () => json(OWN));
  routes.set("/api/users/me/bookmarks", () => json(PAGE(bookmark("other"))));
  fetchMock = vi.fn(async (url: string) => {
    const route = routes.get(new URL(url, "http://api.test").pathname);
    return route ? route() : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
});

const settled = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

const publicPage = async (handle: string) => {
  const view = await mount(
    <Routes>
      <Route path="/u/:handle" element={<PublicProfilePage />} />
    </Routes>,
    { route: `/u/${handle}` },
  );
  await settled();
  return view;
};

const ownPage = async (route = "/profile") => {
  const view = await mount(<OwnProfilePage />, { route });
  await settled();
  return view;
};

const field = (label: string, host: ParentNode) => {
  const row = [...host.querySelectorAll("label")].find((node) =>
    node.textContent?.startsWith(label),
  );
  return row?.querySelector("input, textarea") as HTMLInputElement;
};

describe("a public profile", () => {
  test("shows the person, their pins, and the rest of what they publish", async () => {
    routes.set("/api/public/users/ada", () => json(PROFILE));
    routes.set("/api/public/users/ada/bookmarks", () => json(PAGE(bookmark("other"))));
    const { host } = await publicPage("ada");

    expect(host.querySelector("h1")?.textContent).toContain("Ada Lovelace");
    expect(host.textContent).toContain("@ada");
    expect(host.querySelector("p.whitespace-pre-line")?.textContent).toBe(PROFILE.bio);
    expect(host.textContent).toContain("Royal Society");
    expect(host.textContent).toContain("pinned");
    expect(host.textContent).toContain("other");
    expect(host.textContent).not.toContain("ada@example.test");
  });

  test("opens outside links away from the app and shows them without their scheme", async () => {
    routes.set("/api/public/users/ada", () => json(PROFILE));
    routes.set("/api/public/users/ada/bookmarks", () => json(PAGE()));
    const { host } = await publicPage("ada");

    const link = host.querySelector<HTMLAnchorElement>('a[href="https://ada.example/"]');
    expect(link?.textContent).toBe("ada.example");
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toContain("noopener");
  });

  test("a profile without anything says only when they joined", async () => {
    routes.set("/api/public/users/ada", () =>
      json({
        ...PROFILE,
        bio: null,
        company: null,
        location: null,
        website: null,
        links: [],
        pinned: [],
        organizations: [],
      }),
    );
    routes.set("/api/public/users/ada/bookmarks", () => json(PAGE()));
    const { host } = await publicPage("ada");

    expect(host.textContent).toContain("Joined");
    expect(host.textContent).toContain("Nothing published yet");
    expect(host.textContent).not.toContain("Pinned");
  });

  test("a handle nobody may read is not found", async () => {
    const { host } = await publicPage("nobody");

    expect(host.textContent).toContain("Profile not found");
  });

  test("a failed request offers another try instead of saying it is missing", async () => {
    routes.set("/api/public/users/ada", () => json({ message: "down" }, 500));
    routes.set("/api/public/users/ada/bookmarks", () => json(PAGE()));
    const { host } = await publicPage("ada");

    await vi.waitFor(() => expect(host.textContent).toContain("This profile could not be loaded"), {
      timeout: 3000,
    });
    expect(buttonByText("Try again", host)).toBeDefined();
  });
});

describe("their own profile", () => {
  test("shows counts only its owner sees and a way to edit", async () => {
    const { host } = await ownPage();

    expect(host.textContent).toContain("only you see this");
    expect(host.textContent).toContain("40");
    expect(buttonByText("Edit profile", host)).toBeDefined();
    expect(host.querySelector('a[href="/u/ada"]')?.textContent).toContain("Public page");
  });

  test("while private it says so and has no public page to open", async () => {
    routes.set("/api/users/me", () => json({ ...USER, profilePublic: false }));
    const { host } = await ownPage();

    expect(host.textContent).toContain("Private");
    expect(host.textContent).not.toContain("Public page");
  });

  test("saves every field together and keeps a refused value for another try", async () => {
    routes.set("/api/users/me", () => json(USER));
    const { host } = await ownPage("/profile?view=edit");
    fetchMock.mockImplementationOnce(async () =>
      json({ status: 409, message: "The handle 'grace' is already taken." }, 409),
    );

    await changeValue(field("Handle", host), "grace");
    expect(host.textContent).toContain("The old address stops working");
    await click("Save profile", host);
    await settled();

    expect(requests("PATCH")[0]?.body).toMatchObject({ handle: "grace", company: PROFILE.company });
    expect(host.textContent).toContain("already taken");
    expect(field("Handle", host).value).toBe("grace");
  });

  test("leaves empty link slots out of what it saves", async () => {
    const { host } = await ownPage("/profile?view=edit");

    await click("Save profile", host);
    await settled();

    expect(requests("PATCH")[0]?.body.links).toEqual(PROFILE.links);
  });

  test("pins another bookmark, reorders, and saves the whole list", async () => {
    routes.set("/api/users/me/pins", () => json(OWN));
    const { host } = await ownPage("/profile?view=edit");

    await click("Pin", host);
    await click(host.querySelector('[aria-label="Move other up"]')!);
    await click("Save pins", host);
    await settled();

    expect(requests("PUT")).toContainEqual({
      path: "/api/users/me/pins",
      body: { publicIds: ["id-other", "id-pinned"] },
    });
  });

  test("what was just unpinned can be pinned again before saving", async () => {
    const { host } = await ownPage("/profile?view=edit");

    await click(host.querySelector('[aria-label="Unpin pinned"]')!);

    const rows = [...host.querySelectorAll("ul li")].map((row) => row.textContent);
    expect(rows.some((row) => row?.startsWith("pinned"))).toBe(true);
  });

  test("a seventh pin cannot be added", async () => {
    const pinned = ["a", "b", "c", "d", "e", "f"].map((name) => bookmark(name));
    routes.set("/api/users/me/profile", () => json({ ...OWN, profile: { ...PROFILE, pinned } }));
    const { host } = await ownPage("/profile?view=edit");

    expect(buttonByText("Pin", host)?.hasAttribute("disabled")).toBe(true);
  });

  test("a password change needs both new entries to match and clears on success", async () => {
    routes.set("/api/users/me/password", () => new Response(null, { status: 204 }));
    const { host } = await ownPage("/profile?view=edit");
    await changeValue(field("Current password", host), "the-current-one");
    await changeValue(field("New password", host), "a-brand-new-one");
    await changeValue(field("Repeat new password", host), "something-else");

    expect(host.textContent).toContain("do not match");
    expect(buttonByText("Change password", host)?.hasAttribute("disabled")).toBe(true);

    await changeValue(field("Repeat new password", host), "a-brand-new-one");
    await click("Change password", host);
    await settled();

    expect(requests("POST")).toContainEqual({
      path: "/api/users/me/password",
      body: { currentPassword: "the-current-one", newPassword: "a-brand-new-one" },
    });
    expect(host.textContent).toContain("Password changed.");
    expect(field("Current password", host).value).toBe("");
  });

  test("a wrong current password keeps what was typed and says why", async () => {
    routes.set("/api/users/me/password", () =>
      json({ status: 400, message: "That is not your current password." }, 400),
    );
    const { host } = await ownPage("/profile?view=edit");
    await changeValue(field("Current password", host), "a-wrong-one-here");
    await changeValue(field("New password", host), "a-brand-new-one");
    await changeValue(field("Repeat new password", host), "a-brand-new-one");

    await click("Change password", host);
    await settled();

    expect(host.textContent).toContain("That is not your current password.");
    expect(field("Current password", host).value).toBe("a-wrong-one-here");
  });
});
