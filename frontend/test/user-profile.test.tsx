/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { buttonByText, changeValue, click } from "./support/dom";
import {
  bookmark,
  fetchStub,
  field,
  json,
  OWN,
  ownPage,
  PAGE,
  PROFILE,
  publicPage,
  requests,
  routes,
  serveProfileApi,
  settled,
  USER,
} from "./support/user-profile-fixture";

beforeEach(serveProfileApi);

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
    fetchStub().mockImplementationOnce(async () =>
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

  test("asks before leaving the editor with unsaved changes, and stays when told to", async () => {
    const { host } = await ownPage("/profile?view=edit");

    await changeValue(field("Company", host), "Difference Engines");
    await click("Done", host);
    await settled();
    expect(document.body.textContent).toContain("Your profile changes are not saved yet");

    await click("Cancel");
    await settled();
    expect(field("Company", host).value).toBe("Difference Engines");

    await click("Done", host);
    await settled();
    await click("Leave");
    await settled();
    expect(host.textContent).toContain("Edit profile");
  });

  test("leaves the editor without asking when nothing changed", async () => {
    const { host } = await ownPage("/profile?view=edit");

    await click("Done", host);
    await settled();

    expect(document.body.textContent).not.toContain("Leave without saving?");
    expect(host.textContent).toContain("Edit profile");
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
});
