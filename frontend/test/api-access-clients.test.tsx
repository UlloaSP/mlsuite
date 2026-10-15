// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { ApiClientPage } from "@/features/api-access/pages/api-client-page";
import { ApiClientsPage } from "@/features/api-access/pages/api-clients-page";
import type {
  ApiAccessBookmarkDto,
  ApiClientDto,
  ApiClientKeyDto,
  ApiClientSummaryDto,
} from "@/shared/api/openapi.gen";
import { changeValue, click, mount } from "./support/dom";

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));

const member = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
  useCan: (permission: string) => member.permissions.includes(permission),
}));

const AT = "2026-10-01T10:00:00Z";
const SECRET = "mls_AbC12345_this-secret-is-shown-once";

const summary = (overrides: Partial<ApiClientSummaryDto> = {}): ApiClientSummaryDto => ({
  id: 9,
  name: "Lab2Pressure",
  description: "Billing ERP",
  status: "ACTIVE",
  suspensionReason: null,
  suspendedAt: null,
  keyCount: 1,
  bookmarkCount: 1,
  lastUsedAt: null,
  createdByName: "Ada",
  createdAt: AT,
  updatedAt: AT,
  ...overrides,
});
const key = (overrides: Partial<ApiClientKeyDto> = {}): ApiClientKeyDto => ({
  id: 1,
  name: "Production",
  prefix: "mls_AbC12345",
  createdByName: "Ada",
  createdAt: AT,
  lastUsedAt: null,
  ...overrides,
});
const accessBookmark = (overrides: Partial<ApiAccessBookmarkDto> = {}): ApiAccessBookmarkDto => ({
  id: 70,
  apiId: "pub-70",
  name: "production",
  schemaId: 5,
  schemaName: "Risk",
  version: 2,
  versionName: "Baseline",
  visibility: "PRIVATE",
  modelId: 4,
  modelName: "risk-forest",
  refusal: null,
  clientNames: ["Lab2Pressure"],
  ...overrides,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 6; turn += 1) await flush();
};
const loaded = async () => {
  for (let turn = 0; turn < 200 && document.body.querySelector('[role="status"]'); turn += 1) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  }
};

let client: ApiClientDto;
let fetchMock: ReturnType<typeof vi.fn>;
const requests = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    method: (init as RequestInit | undefined)?.method ?? "GET",
    path: new URL(String(url)).pathname,
    body:
      typeof (init as RequestInit | undefined)?.body === "string"
        ? (JSON.parse((init as RequestInit).body as string) as unknown)
        : undefined,
  }));
const writes = () => requests().filter((request) => request.method !== "GET");

beforeEach(() => {
  member.permissions = ["canViewApiAccess", "canManageApiAccess"];
  toasts.success.mockClear();
  client = { client: summary(), keys: [key()], bookmarks: [accessBookmark()] };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(String(url));
    const method = init?.method ?? "GET";
    if (pathname === "/api/api-clients" && method === "POST") {
      return json({ ...client, client: summary({ id: 12, name: "Edge" }) }, 201);
    }
    if (pathname === "/api/api-clients") {
      return json({ items: [client.client], page: 0, size: 24, totalItems: 1, hasNext: false });
    }
    if (pathname.endsWith("/keys") && method === "POST") {
      client = { ...client, keys: [...client.keys, key({ id: 2, name: "Staging" })] };
      return json({ key: key({ id: 2, name: "Staging" }), secret: SECRET }, 201);
    }
    if (pathname.includes("/keys/") && method === "DELETE") {
      client = { ...client, keys: [] };
      return new Response(null, { status: 204 });
    }
    if (pathname.includes("/bookmarks/") && method === "PUT") {
      client = {
        ...client,
        bookmarks: [...client.bookmarks, accessBookmark({ id: 71, name: "staging" })],
      };
      return json(client);
    }
    if (pathname.includes("/bookmarks/") && method === "DELETE") {
      client = { ...client, bookmarks: [] };
      return json(client);
    }
    if (pathname === "/api/api-clients/9" && method === "DELETE")
      return new Response(null, { status: 204 });
    if (pathname === "/api/api-access/bookmarks") {
      return json([
        accessBookmark(),
        accessBookmark({ id: 71, name: "staging", clientNames: [] }),
        accessBookmark({ id: 72, name: "ensemble", modelId: null, refusal: "Binds 2 models." }),
      ]);
    }
    if (pathname.startsWith("/api/api-clients/")) return json(client);
    return json({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
async function open(route: string) {
  const view = await mount(
    <Routes>
      <Route path="/api-access/clients" element={<ApiClientsPage />} />
      <Route path="/api-access/clients/:clientId" element={<ApiClientPage />} />
    </Routes>,
    { route, queryClient: newClient() },
  );
  await settle();
  await loaded();
  return view.host;
}
const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');
const tab = (name: string) =>
  [...document.body.querySelectorAll<HTMLElement>('[role="tab"]')].find((node) =>
    node.textContent?.startsWith(name),
  )!;
async function openTab(name: string) {
  await act(async () => {
    tab(name).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    tab(name).click();
  });
  await settle();
}

describe("API clients", () => {
  test("the catalog lists each client with its state and counts, linking to its page", async () => {
    const host = await open("/api-access/clients");

    const row = host.querySelector("article")!;
    expect(row.textContent).toContain("Lab2Pressure");
    expect(row.textContent).toContain("Active");
    expect(row.textContent).toContain("1 bookmark");
    expect(row.textContent).toContain("1 key");
    expect(row.textContent).toContain("No successful calls yet");
    expect(row.querySelector("a")?.getAttribute("href")).toBe("/api-access/clients/9");
  });

  test("a member who manages API access creates a client and lands on its keys", async () => {
    const host = await open("/api-access/clients");

    await click("Create client", host);
    await changeValue(dialog()!.querySelector<HTMLInputElement>('input[name="name"]')!, " Edge ");
    await click("Create client", dialog()!);
    await settle();

    expect(writes()[0]).toEqual({
      method: "POST",
      path: "/api/api-clients",
      body: { name: "Edge", description: null },
    });
    expect(requests().some((request) => request.path === "/api/api-clients/12")).toBe(true);
  });

  test("a member who only views sees clients but no way to change them", async () => {
    member.permissions = ["canViewApiAccess"];
    const host = await open("/api-access/clients/9");

    expect(host.textContent).not.toContain("Issue key");
    expect(tab("Settings")).toBeUndefined();
    await openTab("Keys");
    expect(host.querySelector('[aria-label="Revoke Production"]')).toBeNull();
  });

  test("an issued key shows its secret once, and closing forgets it", async () => {
    const host = await open("/api-access/clients/9");

    await click("Issue key", host);
    await changeValue(dialog()!.querySelector<HTMLInputElement>('input[name="name"]')!, "Staging");
    await click("Issue key", dialog()!);
    await settle();

    const secret = document.body.querySelector<HTMLInputElement>(
      'input[aria-label="API key secret"]',
    );
    expect(secret?.value).toBe(SECRET);
    expect(writes()[0]).toMatchObject({
      path: "/api/api-clients/9/keys",
      body: { name: "Staging" },
    });

    await click("I have stored it");
    await settle();
    expect(document.body.textContent).not.toContain(SECRET);
    await openTab("Keys");
    expect(host.textContent).toContain("Staging");
  });

  test("a key is revoked after a confirmation naming its prefix", async () => {
    await open("/api-access/clients/9?tab=keys");

    await click(document.body.querySelector('[aria-label="Revoke Production"]')!);
    expect(dialog()?.textContent).toContain("mls_AbC12345…");
    await click("Revoke", dialog()!);
    await settle();

    expect(writes()).toEqual([
      { method: "DELETE", path: "/api/api-clients/9/keys/1", body: undefined },
    ]);
    expect(document.body.textContent).toContain("No keys yet");
  });

  test("a client is given a bookmark it does not have yet, and loses one after confirming", async () => {
    await open("/api-access/clients/9?tab=access");
    expect(document.body.textContent).toContain("Runnable");

    await click("Give bookmark");
    await settle();
    const field = dialog()!.querySelector<HTMLInputElement>('[aria-label="Bookmark"]')!;
    await act(async () => field.focus());
    await settle();
    const options = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining("Risk › staging"),
      expect.stringContaining("Cannot run yet"),
    ]);
    await act(async () => options[0].dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    await click("Give bookmark", dialog()!);
    await settle();
    expect(writes()[0]).toMatchObject({ method: "PUT", path: "/api/api-clients/9/bookmarks/71" });

    await click(document.body.querySelector('[aria-label="Take production away"]')!);
    await click("Remove", dialog()!);
    await settle();
    expect(writes()[1]).toMatchObject({
      method: "DELETE",
      path: "/api/api-clients/9/bookmarks/70",
    });
  });

  test("a suspended client says why and takes no new key or bookmark", async () => {
    client = {
      ...client,
      client: summary({ status: "SUSPENDED", suspensionReason: "Scraping", suspendedAt: AT }),
    };
    const host = await open("/api-access/clients/9?tab=access");

    expect(host.textContent).toContain("Suspended by the platform");
    expect(host.textContent).toContain("Scraping");
    expect(host.textContent).not.toContain("Issue key");
    const give = [...host.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Give bookmark"),
    );
    expect(give?.disabled).toBe(true);
  });

  test("deleting a client confirms what stays and returns to the catalog", async () => {
    await open("/api-access/clients/9?tab=settings");

    await click("Delete client");
    expect(dialog()?.textContent).toContain("past calls stay in the request log");
    await click("Delete client", dialog()!);
    await settle();

    expect(writes()).toEqual([{ method: "DELETE", path: "/api/api-clients/9", body: undefined }]);
    expect(requests().at(-1)?.path).toBe("/api/api-clients");
  });
});
