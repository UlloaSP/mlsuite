/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { PublicBookmarkCard } from "@/features/explore/components/PublicBookmarkCard";
import { noteSegments } from "@/features/explore/lib/publication-note-links";
import { PublicBookmarkPage } from "@/features/explore/pages/public-bookmark-page";
import type { PublicBookmarkDto, PublicBookmarkSummaryDto } from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

vi.mock("@/capabilities/workspace-context/session", async (original) => ({
  ...(await original<typeof import("@/capabilities/workspace-context/session")>()),
  useUser: () => ({ data: undefined, error: new Error("Unauthorized"), isLoading: false }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({ data: undefined, isLoading: false }),
  useCurrentOrganizationId: () => undefined,
  useCan: () => false,
}));

const PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";
const LOGO = "/api/public/organizations/3/logo?v=1700000000000";
const AT = "2026-10-01T10:00:00Z";
const NOTE =
  "Published in Lancet Digital Health 2026, doi:10.1016/j.landig.2026.01.001.\nSee https://example.org/paper. Research use only.";

const summary = (overrides: Partial<PublicBookmarkSummaryDto> = {}): PublicBookmarkSummaryDto => ({
  publicId: PUBLIC_ID,
  name: "production",
  description: null,
  inputCount: 1,
  reportCount: 1,
  organizationName: "Acme Health",
  organizationLogoUrl: LOGO,
  updatedAt: AT,
  ...overrides,
});
const bookmark = (overrides: Partial<PublicBookmarkDto> = {}): PublicBookmarkDto => ({
  ...summary(),
  publicationNote: NOTE,
  version: 2,
  formSchema: {
    fields: [{ kind: "number", label: "Age", mappedTo: "in0" }],
    reports: [{ kind: "classifier", label: "Risk", id: "out0", mappedTo: "out0" }],
  },
  ...overrides,
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 4; turn += 1) await flush();
};
const logo = (host: ParentNode) =>
  host.querySelector<HTMLImageElement>("img[data-organization-logo]");
const note = (host: ParentNode) =>
  host.querySelector<HTMLElement>('aside[aria-label="Note from Acme Health"]');

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function page(dto: PublicBookmarkDto) {
  vi.stubGlobal("fetch", (url: unknown) => {
    if (String(url).endsWith("/examples")) return Promise.resolve(json([]));
    if (String(url).endsWith("/runs")) return Promise.resolve(json([]));
    if (String(url).endsWith("/quota")) {
      return Promise.resolve(json({ limit: 50, remaining: 50, resetsAt: null }));
    }
    return Promise.resolve(json(dto));
  });
  const view = await mount(
    <Routes>
      <Route path="/explore/:publicId" element={<PublicBookmarkPage />} />
    </Routes>,
    {
      route: `/explore/${PUBLIC_ID}`,
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    },
  );
  await settle();
  return view.host;
}

describe("the publisher on a public bookmark", () => {
  test("the feed card shows the organization's logo beside its name", async () => {
    const { host, rerender } = await mount(<PublicBookmarkCard bookmark={summary()} />, {
      route: "/explore",
    });

    expect(host.textContent).toContain("Acme Health");
    expect(logo(host)?.src).toBe(`${window.location.origin}${LOGO}`);
    expect(logo(host)?.alt).toBe("");

    await rerender(<PublicBookmarkCard bookmark={summary({ organizationLogoUrl: null })} />);
    expect(logo(host)).toBeNull();
    expect(host.textContent).toContain("Acme Health");
  });

  test("the page shows the logo and the publisher's note with its links made to open", async () => {
    const host = await page(bookmark());

    expect(logo(host)?.src).toBe(`${window.location.origin}${LOGO}`);
    const aside = note(host)!;
    expect(aside.textContent).toContain("Note from Acme Health");
    expect(aside.textContent).toContain("Research use only.");
    const links = [...aside.querySelectorAll("a")].map((link) => ({
      href: link.getAttribute("href"),
      text: link.textContent,
      rel: link.getAttribute("rel"),
      target: link.getAttribute("target"),
    }));
    expect(links).toEqual([
      {
        href: "https://doi.org/10.1016/j.landig.2026.01.001",
        text: "doi:10.1016/j.landig.2026.01.001",
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      },
      {
        href: "https://example.org/paper",
        text: "https://example.org/paper",
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      },
    ]);
  });

  test("a bookmark without a note shows none", async () => {
    const host = await page(bookmark({ publicationNote: null, organizationLogoUrl: null }));

    expect(note(host)).toBeNull();
    expect(logo(host)).toBeNull();
    expect(host.textContent).toContain("Acme Health");
  });

  test("a note is typed text: only addresses and DOIs in it become links", () => {
    expect(noteSegments("Bare DOI 10.1000/xyz123; then (https://a.example/p?q=1).")).toEqual([
      { kind: "text", text: "Bare DOI " },
      { kind: "link", text: "10.1000/xyz123", href: "https://doi.org/10.1000/xyz123" },
      { kind: "text", text: "; then (" },
      { kind: "link", text: "https://a.example/p?q=1", href: "https://a.example/p?q=1" },
      { kind: "text", text: ")." },
    ]);
    expect(noteSegments("<b>no markup</b> and no links")).toEqual([
      { kind: "text", text: "<b>no markup</b> and no links" },
    ]);
  });
});
