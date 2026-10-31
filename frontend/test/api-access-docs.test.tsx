// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { apiDocsMarkdown, buildApiDocs } from "@/features/api-access/lib/endpoint-docs";
import { ApiDocsPage } from "@/features/api-access/pages/api-docs-page";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import type { ApiAccessBookmarkDto, ModelDto, SchemaBookmarkDto } from "@/shared/api/openapi.gen";
import { click, mount } from "./support/dom";

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));

const member = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
  useCan: (permission: string) => member.permissions.includes(permission),
}));

const AT = "2026-10-01T10:00:00Z";
const URL_OF = (path: string) => `https://mlsuite.test${path}`;

const signature = {
  fields: [
    { kind: "number", label: "age", required: true, mappedTo: "age", step: 1 },
    { kind: "boolean", label: "smoker", required: false, mappedTo: "smoker" },
    {
      kind: "category",
      label: "city",
      required: true,
      mappedTo: "city",
      options: ["Madrid", "Lima"],
    },
    {
      kind: "series",
      label: "pressure",
      required: false,
      mappedTo: "pressure",
      aggregations: [{ label: "max", mappedTo: "pressure_max" }],
    },
    {
      kind: "onehot-category",
      label: "sex",
      required: true,
      options: [
        { label: "male", value: "male", mappedTo: "sex__male" },
        { label: "female", value: "female", mappedTo: "sex__female" },
      ],
    },
  ],
  reports: [{ kind: "classifier", label: "Risk", mappedTo: 0, labels: ["0", "1"] }],
};
const model = { id: 4, name: "risk-forest", inputSchema: signature } as unknown as ModelDto;

const given = (overrides: Partial<ApiAccessBookmarkDto> = {}): ApiAccessBookmarkDto => ({
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
const docsFor = (refusal: string | null = null) =>
  buildApiDocs({
    url: URL_OF,
    bookmark: { apiId: "pub-70", name: "production", refusal, modelName: "risk-forest" },
    model: refusal ? undefined : { inputSchema: signature },
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 6; turn += 1) await flush();
};

let bookmarks: ApiAccessBookmarkDto[];
let fetchMock: ReturnType<typeof vi.fn>;
const writeText = vi.fn<(text: string) => Promise<void>>();
const paths = () => fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);

beforeEach(() => {
  member.permissions = ["canViewApiAccess"];
  bookmarks = [given(), given({ id: 71, apiId: null, name: "staging", clientNames: [] })];
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  fetchMock = vi.fn(async (url: string) => {
    const { pathname } = new URL(String(url));
    if (pathname === "/api/api-access/bookmarks") return json(bookmarks);
    if (pathname === "/api/models/4") return json(model);
    return json({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function openDocs(route = "/api-access/docs") {
  const view = await mount(
    <Routes>
      <Route path="/api-access/docs" element={<ApiDocsPage />} />
    </Routes>,
    { route, queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  );
  await settle();
  return view.host;
}

describe("the client API reference", () => {
  test("documents every feature of the model a bookmark runs, and what ran in the answer", () => {
    const docs = docsFor();

    expect(docs.url).toBe("https://mlsuite.test/api/v1/bookmarks/pub-70/predictions");
    expect(docs.request?.features.map((feature) => feature.name)).toEqual([
      "age",
      "smoker",
      "city",
      "pressure",
      "pressure_max",
      "sex__male",
      "sex__female",
    ]);
    expect(JSON.parse(docs.request!.example).features).toMatchObject({
      sex__male: 1,
      sex__female: 0,
    });
    const response = JSON.parse(docs.response!.example);
    expect(response.bookmark).toEqual({ id: "pub-70", name: "production" });
    expect(response.model.name).toBe("risk-forest");
    expect(response.outputs).toEqual([{ prediction: "0", probabilities: { "0": 0.8, "1": 0.2 } }]);
    expect(docs.curl).toContain('"X-MLSuite-Key: $MLSUITE_API_KEY"');
  });

  test("the Markdown carries the limits and every problem code", () => {
    const markdown = apiDocsMarkdown(docsFor());

    expect(markdown).toContain("POST https://mlsuite.test/api/v1/bookmarks/pub-70/predictions");
    expect(markdown).toContain("| `sex__male` | number, 1 or 0 (sex is male) | No |");
    expect(markdown).toContain("## Limits");
    expect(markdown).toContain("Retry-After");
    expect(markdown).toContain("application/problem+json");
    for (const code of [
      "invalid_key",
      "client_suspended",
      "bookmark_not_found",
      "rate_limited",
      "quota_exceeded",
      "runtime_busy",
    ]) {
      expect(markdown).toContain(`\`${code}\``);
    }
  });

  test("a bookmark clients cannot run gets the reason instead of a contract", () => {
    const docs = docsFor(
      "Its snapshot binds 2 models; clients run a bookmark of exactly one model.",
    );

    expect(docs.notice).toContain("409");
    expect(docs.notice).toContain("binds 2 models");
    expect(docs.request).toBeNull();
    expect(docs.curl).toBeNull();
    expect(apiDocsMarkdown(docs)).toContain("## Not available");
  });

  test("the page documents the bookmarks given to a client and copies what it shows", async () => {
    const host = await openDocs();

    expect(host.textContent).toContain("Given to Lab2Pressure.");
    expect(host.textContent).toContain(
      `${window.location.origin}/api/v1/bookmarks/pub-70/predictions`,
    );
    expect(host.querySelector('table[aria-label="Features"]')?.textContent).toContain(
      "sex__female",
    );
    expect(paths()).toEqual(["/api/api-access/bookmarks", "/api/models/4"]);

    await click("Copy as Markdown", host);
    expect(writeText.mock.lastCall![0]).toBe(
      apiDocsMarkdown(docsFor()).replaceAll("https://mlsuite.test", window.location.origin),
    );
    expect(toasts.success).toHaveBeenCalledWith("Docs copied");
  });

  test("a bookmark no client was given is explained, and a refused one reads no model", async () => {
    bookmarks = [
      given({ refusal: "Its schema is archived.", modelId: null }),
      given({ id: 71, apiId: null, name: "staging", clientNames: [] }),
    ];
    const host = await openDocs("/api-access/docs?bookmark=71");

    expect(host.textContent).toContain("No client may run staging yet.");
    expect(host.textContent).toContain("Its schema is archived.");
    expect(paths()).toEqual(["/api/api-access/bookmarks"]);
  });

  test("without a bookmark given to a client the page leads to the clients", async () => {
    bookmarks = [given({ apiId: null, clientNames: [] })];
    const host = await openDocs();

    expect(host.textContent).toContain("No bookmark is open to clients");
    expect(host.querySelector('a[href="/api-access/clients"]')).not.toBeNull();
  });
});

describe("a bookmark's way to the client API", () => {
  const bookmark: SchemaBookmarkDto = {
    id: 70,
    schemaId: 5,
    schemaName: "Risk",
    versionId: 9,
    version: 1,
    versionName: "Baseline",
    name: "production",
    description: null,
    publicationNote: null,
    visibility: "PRIVATE",
    publicId: null,
    exampleCount: 0,
    staleExampleCount: 0,
    createdAt: AT,
    updatedAt: AT,
  };
  function Location() {
    return <output>{`${useLocation().pathname}${useLocation().search}`}</output>;
  }
  const openActions = async () => {
    await mount(
      <>
        <SchemaBookmarkCatalogItem bookmark={bookmark} />
        <Location />
      </>,
      { route: "/schemas/5/bookmarks" },
    );
    const trigger = document.body.querySelector<HTMLButtonElement>(
      '[aria-label="Open actions for production"]',
    )!;
    await act(async () =>
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  };

  test("members who may view API access open the bookmark's endpoint from its menu", async () => {
    const items = await openActions();
    const entry = items.find((item) => item.textContent === "API access")!;

    await click(entry);
    expect(document.body.querySelector("output")?.textContent).toBe("/api-access/docs?bookmark=70");
  });

  test("other members are not offered it", async () => {
    member.permissions = ["canCreateModels"];
    const items = await openActions();

    expect(items.map((item) => item.textContent)).toEqual(["Edit name and description", "Delete"]);
  });
});
