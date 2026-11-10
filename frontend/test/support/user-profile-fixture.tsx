/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// The profile pages over a fetch stub, shared by the tests of a person's profile and its settings.

import { act } from "react";
import { vi } from "vite-plus/test";
import { OwnProfilePage } from "@/features/user/pages/own-profile-page";
import { PublicProfilePage } from "@/features/user/pages/public-profile-page";
import { mount } from "./dom";
import type {
  OwnProfileDto,
  PublicBookmarkSummaryDto,
  PublicProfileDto,
  UserDto,
} from "@/shared/api/openapi.gen";

export const bookmark = (name: string, publisherHandle: string | null = "ada") =>
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

export const PROFILE: PublicProfileDto = {
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

export const USER: UserDto = {
  id: 7,
  username: "ada",
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

export const OWN: OwnProfileDto = {
  profile: PROFILE,
  models: 3,
  schemas: 2,
  plugins: 1,
  inferences: 40,
};
export const PAGE = (...items: PublicBookmarkSummaryDto[]) => ({
  items,
  page: 0,
  size: 24,
  totalItems: items.length,
  hasNext: false,
});

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const routes = new Map<string, () => Response>();
let fetchMock: ReturnType<typeof vi.fn>;

/** The fetch stub of the current test, to answer one call differently. */
export const fetchStub = () => fetchMock;

export const requests = (method: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({
      path: new URL(String(url), "http://api.test").pathname,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
    }));

/** Answers the profile pages' requests from {@link routes}; call it before each test. */
export const serveProfileApi = () => {
  routes.clear();
  routes.set("/api/users/me", () => json(USER));
  routes.set("/api/users/me/profile", () => json(OWN));
  routes.set("/api/users/me/bookmarks", () => json(PAGE(bookmark("other"))));
  fetchMock = vi.fn(async (url: string) => {
    const route = routes.get(new URL(url, "http://api.test").pathname);
    return route ? route() : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
};

export const settled = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

export const publicPage = async (handle: string) => {
  const view = await mount(null, {
    route: `/u/${handle}`,
    routes: { "/u/$handle": <PublicProfilePage /> },
  });
  await settled();
  return view;
};

export const ownPage = async (route = "/profile") => {
  const view = await mount(<OwnProfilePage />, { route });
  await settled();
  return view;
};

export const field = (label: string, host: ParentNode) => {
  const row = [...host.querySelectorAll("label")].find((node) =>
    node.textContent?.startsWith(label),
  );
  return (row?.control ?? row?.querySelector("input, textarea")) as HTMLInputElement;
};
