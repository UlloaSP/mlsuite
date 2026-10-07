// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { beforeEach, afterEach, describe, expect, test, vi } from "vite-plus/test";
import { BookmarkSnapshotDialog } from "@/features/schemas/components/BookmarkSnapshotDialog";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import type { SchemaBookmarkDto, SchemaVersionDto } from "@/shared/api/openapi.gen";
import { changeValue, click, mount } from "./support/dom";

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));

const member = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
  useCan: (permission: string) => member.permissions.includes(permission),
}));

const AT = "2026-10-01T10:00:00Z";

const bookmark = (overrides: Partial<SchemaBookmarkDto> = {}): SchemaBookmarkDto => ({
  id: 70,
  schemaId: 5,
  schemaName: "Risk",
  versionId: 9,
  version: 1,
  versionName: "Baseline",
  name: "production",
  description: "Estimates cardiovascular risk.",
  visibility: "PRIVATE",
  publicId: null,
  exampleCount: 0,
  staleExampleCount: 0,
  createdAt: AT,
  updatedAt: AT,
  ...overrides,
});

const snapshot = { id: 9, schemaId: 5, version: 1, name: "Baseline" } as SchemaVersionDto;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 4; turn += 1) await flush();
};
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });

type Fetch = (url: unknown, init?: RequestInit) => unknown;
let fetchMock: ReturnType<typeof vi.fn<Fetch>>;
beforeEach(() => {
  member.permissions = ["canCreateModels"];
  toasts.success.mockClear();
  fetchMock = vi.fn<Fetch>();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const requests = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    method: init?.method,
    path: new URL(String(url)).pathname,
    body: JSON.parse(String(init?.body)) as unknown,
  }));
const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');
const nameField = () => dialog()!.querySelector<HTMLInputElement>('input[name="name"]')!;
const descriptionField = () =>
  dialog()!.querySelector<HTMLTextAreaElement>('textarea[name="description"]')!;

async function openActions(name: string) {
  const trigger = document.body.querySelector<HTMLButtonElement>(
    `[aria-label="Open actions for ${name}"]`,
  )!;
  // The menu opens from the keyboard in jsdom and renders in a portal on the body.
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];
}
async function openEditor(dto = bookmark()) {
  const view = await mount(<SchemaBookmarkCatalogItem bookmark={dto} />, {
    route: "/",
    queryClient: newClient(),
  });
  const items = await openActions(dto.name);
  await click(items.find((item) => item.textContent === "Edit name and description")!);
  return view;
}

describe("a bookmark's name and description in its schema", () => {
  test("the row shows the bookmark's own description", async () => {
    const { host, rerender } = await mount(<SchemaBookmarkCatalogItem bookmark={bookmark()} />, {
      route: "/",
      queryClient: newClient(),
    });
    expect(host.textContent).toContain("Estimates cardiovascular risk.");

    await rerender(<SchemaBookmarkCatalogItem bookmark={bookmark({ description: null })} />);
    expect(host.querySelector("article p")).toBeNull();
  });

  test("only members who may save bookmarks are offered the edit", async () => {
    member.permissions = ["canPublishBookmarks"];
    await mount(<SchemaBookmarkCatalogItem bookmark={bookmark()} />, {
      route: "/",
      queryClient: newClient(),
    });

    const items = await openActions("production");

    expect(items.map((item) => item.textContent)).toEqual(["Public examples", "Publish"]);
  });

  test("editing sends the new name and description and closes on success", async () => {
    fetchMock.mockResolvedValue(json(bookmark({ name: "cardio-screening" })));
    await openEditor();
    expect(nameField().value).toBe("production");
    expect(descriptionField().value).toBe("Estimates cardiovascular risk.");

    await changeValue(nameField(), "  cardio-screening ");
    await changeValue(descriptionField(), "Screens for cardiovascular risk.");
    await click("Save changes");
    await settle();

    expect(requests()).toEqual([
      {
        method: "PATCH",
        path: "/api/schema-bookmarks/70",
        body: { name: "cardio-screening", description: "Screens for cardiovascular risk." },
      },
    ]);
    expect(dialog()).toBeNull();
    expect(toasts.success).toHaveBeenCalledExactlyOnceWith("Bookmark updated");
  });

  test("clearing the description removes it", async () => {
    fetchMock.mockResolvedValue(json(bookmark({ description: null })));
    await openEditor();

    await changeValue(descriptionField(), "   ");
    await click("Save changes");
    await settle();

    expect(requests()[0].body).toEqual({ name: "production", description: null });
  });

  test("a refusal keeps the dialog open with the reason the API gave", async () => {
    const reason = 'This schema already has a bookmark named "staging".';
    fetchMock.mockResolvedValue(
      json({ status: 409, message: reason, path: "/", timestamp: AT }, 409),
    );
    await openEditor();

    await changeValue(nameField(), "staging");
    await click("Save changes");
    await settle();

    expect(dialog()?.textContent).toContain(reason);
    expect(nameField().value).toBe("staging");
    expect(toasts.success).not.toHaveBeenCalled();
  });

  test("the fields stop at the lengths the API accepts, and a name is required", async () => {
    await openEditor();

    expect(nameField().maxLength).toBe(180);
    expect(nameField().required).toBe(true);
    expect(descriptionField().maxLength).toBe(800);
    expect(descriptionField().required).toBe(false);
  });

  test("a public bookmark says that its public page changes too", async () => {
    await openEditor(bookmark({ visibility: "PUBLIC", publicId: "8f6f3c0e" }));

    expect(dialog()?.textContent).toContain("change on its public page too");
  });
});

describe("bookmarking a snapshot", () => {
  const open = () =>
    mount(<BookmarkSnapshotDialog schemaId="5" version={snapshot} onClose={() => undefined} />, {
      route: "/",
      queryClient: newClient(),
    });

  test("the bookmark is saved with the description typed in the dialog", async () => {
    fetchMock.mockResolvedValue(json(bookmark(), 201));
    await open();
    expect(nameField().value).toBe("baseline");

    await changeValue(nameField(), "production");
    await changeValue(descriptionField(), " Estimates cardiovascular risk. ");
    await click("Save bookmark");
    await settle();

    expect(requests()).toEqual([
      {
        method: "POST",
        path: "/api/schemas/5/bookmarks",
        body: { name: "production", description: "Estimates cardiovascular risk.", versionId: 9 },
      },
    ]);
    expect(toasts.success).toHaveBeenCalledExactlyOnceWith("Bookmark saved");
  });

  test("a bookmark saved without a description sends none", async () => {
    fetchMock.mockResolvedValue(json(bookmark({ description: null }), 201));
    await open();

    await click("Save bookmark");
    await settle();

    expect(requests()[0].body).toEqual({ name: "baseline", description: null, versionId: 9 });
  });
});
