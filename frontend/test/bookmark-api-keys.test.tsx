// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import type {
  BookmarkApiKeyDto,
  ModelDto,
  SchemaBookmarkDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";
import { apiDocsMarkdown, buildApiDocs } from "@/features/schemas/lib/bookmark-api-docs";
import { buttonByText, changeValue, click, mount } from "./support/dom";
import { binding, schemaVersion } from "./support/api-fixtures";

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));

const member = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
  useCan: (permission: string) => member.permissions.includes(permission),
}));

const AT = "2026-10-01T10:00:00Z";
const SECRET = "mls_AbC12345_this-secret-is-shown-once";

const bookmark = (overrides: Partial<SchemaBookmarkDto> = {}): SchemaBookmarkDto => ({
  id: 70,
  schemaId: 5,
  schemaName: "Risk",
  versionId: 9,
  version: 1,
  versionName: "Baseline",
  name: "production",
  description: null,
  publicationNote: null,
  visibility: "PUBLIC",
  publicId: "pub-1",
  exampleCount: 0,
  staleExampleCount: 0,
  createdAt: AT,
  updatedAt: AT,
  ...overrides,
});

const apiKey = (overrides: Partial<BookmarkApiKeyDto> = {}): BookmarkApiKeyDto => ({
  id: 1,
  name: "Lab2Pressure",
  prefix: "mls_AbC12345",
  createdAt: AT,
  createdByName: "Ada Lovelace",
  lastUsedAt: null,
  ...overrides,
});

const version = (bindings: SchemaVersionDto["bindings"]) => schemaVersion({ id: 9, bindings });

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
      columns: [{ id: "field1" }, { id: "field2" }],
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
const model = { id: 4, name: "risk", inputSchema: signature } as unknown as ModelDto;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const refusal = (status: number, message: string) =>
  json({ status, message, path: "/", timestamp: AT }, status);
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 4; turn += 1) await flush();
};

type Fetch = (url: unknown, init?: RequestInit) => unknown;
let fetchMock: ReturnType<typeof vi.fn<Fetch>>;
let stored: BookmarkApiKeyDto[];
let queryClient: QueryClient;
const writeText = vi.fn<(text: string) => Promise<void>>();

/** A tiny server: the list reflects what was created and revoked so far. */
function serve(
  overrides: {
    create?: Response;
    revoke?: Response;
    bindings?: number[];
    /** How many snapshot requests fail before one succeeds. */
    snapshotFailures?: number;
  } = {},
) {
  let snapshotFailures = overrides.snapshotFailures ?? 0;
  fetchMock.mockImplementation((url, init) => {
    const { pathname } = new URL(String(url));
    const method = init?.method ?? "GET";
    if (method === "POST") {
      if (overrides.create) return overrides.create;
      const created = apiKey({ id: 2, name: "Edge", prefix: "mls_ZzZ98765" });
      stored = [...stored, created];
      return json({ key: created, secret: SECRET }, 201);
    }
    if (method === "DELETE") {
      if (overrides.revoke) return overrides.revoke;
      stored = stored.filter((item) => pathname !== `/api/schema-bookmarks/70/api-keys/${item.id}`);
      return new Response(null, { status: 204 });
    }
    if (pathname === "/api/schema-versions/9") {
      if (snapshotFailures-- > 0) return refusal(500, "The snapshot could not be read.");
      return json(version((overrides.bindings ?? [4]).map((modelId) => binding(modelId))));
    }
    if (pathname === "/api/models/4") return json(model);
    return json(stored);
  });
}

beforeEach(() => {
  member.permissions = ["canPublishBookmarks"];
  stored = [apiKey()];
  toasts.error.mockClear();
  toasts.success.mockClear();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  fetchMock = vi.fn<Fetch>();
  vi.stubGlobal("fetch", fetchMock);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
});
afterEach(() => vi.unstubAllGlobals());

const requests = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    method: init?.method ?? "GET",
    path: new URL(String(url)).pathname,
    body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
  }));
const dialogs = () => [...document.body.querySelectorAll<HTMLElement>('[role="dialog"]')];
const keysDialog = () => dialogs()[0]!;
const nameField = () => keysDialog().querySelector<HTMLInputElement>('input[name="name"]')!;
const secretField = () =>
  keysDialog().querySelector<HTMLInputElement>('input[aria-label="API key secret"]');
const menuItems = () => [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];

async function openActions() {
  const trigger = document.body.querySelector<HTMLButtonElement>(
    '[aria-label="Open actions for production"]',
  )!;
  // The menu opens from the keyboard in jsdom and renders in a portal on the body.
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
}
async function openKeys(dto = bookmark()) {
  await mount(<SchemaBookmarkCatalogItem bookmark={dto} />, { route: "/", queryClient });
  await openActions();
  await click(menuItems().find((item) => item.textContent === "API keys")!);
  await settle();
}
async function create(name: string) {
  await changeValue(nameField(), name);
  await click("Create key");
  await settle();
}

describe("a bookmark's API keys", () => {
  test("only members who may publish are offered the keys", async () => {
    member.permissions = ["canCreateModels"];
    await mount(
      <SchemaBookmarkCatalogItem bookmark={bookmark({ visibility: "PRIVATE", publicId: null })} />,
      {
        route: "/",
        queryClient,
      },
    );
    await openActions();

    expect(menuItems().map((item) => item.textContent)).toEqual(["Edit name and description"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("lists each key with its prefix, creator and last use", async () => {
    stored = [
      apiKey(),
      apiKey({ id: 2, name: "Edge", prefix: "mls_ZzZ98765", createdByName: null, lastUsedAt: AT }),
    ];
    serve();
    await openKeys();

    const rows = [...keysDialog().querySelectorAll("li")].map((row) => row.textContent);
    expect(requests()).toEqual([
      { method: "GET", path: "/api/schema-bookmarks/70/api-keys", body: undefined },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("Lab2Pressure");
    expect(rows[0]).toContain("mls_AbC12345…");
    expect(rows[0]).toContain("by Ada Lovelace");
    expect(rows[0]).toContain("Never used");
    expect(rows[1]).not.toContain(" by ");
    expect(rows[1]).toMatch(/Used \d+\w+ ago/);
  });

  test("a private bookmark's keys are said to wait for publishing", async () => {
    serve();
    await openKeys(bookmark({ visibility: "PRIVATE", publicId: null }));

    expect(keysDialog().textContent).toContain("work only while it is published");
  });

  test("a published bookmark carries no publishing warning", async () => {
    serve();
    await openKeys();

    expect(keysDialog().textContent).not.toContain("work only while it is published");
  });

  test("an empty bookmark invites the first key", async () => {
    stored = [];
    serve();
    await openKeys();

    expect(keysDialog().textContent).toContain("No API keys yet");
  });

  test("creating a key shows its secret once and refreshes the list", async () => {
    serve();
    await openKeys();

    await create("  Edge ");

    expect(requests().filter((request) => request.method === "POST")).toEqual([
      { method: "POST", path: "/api/schema-bookmarks/70/api-keys", body: { name: "Edge" } },
    ]);
    expect(secretField()?.value).toBe(SECRET);
    expect(secretField()?.readOnly).toBe(true);
    expect(keysDialog().textContent).toContain("It will not be shown again");
    expect(keysDialog().textContent).toContain("anyone who has it can run this bookmark's model");
    expect(nameField().value).toBe("");
    expect([...keysDialog().querySelectorAll("li")].map((row) => row.textContent)).toEqual([
      expect.stringContaining("Lab2Pressure"),
      expect.stringContaining("mls_ZzZ98765…"),
    ]);

    await click("Copy");
    expect(writeText).toHaveBeenCalledExactlyOnceWith(SECRET);
    expect(toasts.success).toHaveBeenCalledWith("API key copied");
  });

  test("the secret never reaches the query cache and is gone once dismissed", async () => {
    serve();
    await openKeys();
    await create("Edge");

    const cached = JSON.stringify(
      queryClient
        .getQueryCache()
        .findAll()
        .map((query) => query.state.data),
    );
    expect(cached).not.toContain(SECRET);
    expect(
      JSON.stringify(
        queryClient
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state.data),
      ),
    ).not.toContain(SECRET);

    await click("I have stored it");
    expect(secretField()).toBeNull();
    expect(keysDialog().textContent).not.toContain(SECRET);
  });

  test("closing the dialog forgets the secret", async () => {
    serve();
    await openKeys();
    await create("Edge");

    await click(keysDialog().querySelector('button[aria-label="Close"]')!);
    expect(dialogs()).toHaveLength(0);

    await openActions();
    await click(menuItems().find((item) => item.textContent === "API keys")!);
    await settle();
    expect(secretField()).toBeNull();
    expect(document.body.textContent).not.toContain(SECRET);
  });

  test("a refused name shows the API's reason, keeps the name and issues no secret", async () => {
    serve({ create: refusal(409, "An API key named Lab2Pressure already exists.") });
    await openKeys();

    await create("Lab2Pressure");

    expect(keysDialog().textContent).toContain("An API key named Lab2Pressure already exists.");
    expect(nameField().value).toBe("Lab2Pressure");
    expect(secretField()).toBeNull();
  });

  test("a blank name cannot be submitted", async () => {
    serve();
    await openKeys();

    await changeValue(nameField(), "   ");

    expect(buttonByText("Create key")!.disabled).toBe(true);
  });

  test("revoking asks first, then deletes the key and refreshes the list", async () => {
    serve();
    await openKeys();

    await click(keysDialog().querySelector('button[aria-label="Revoke Lab2Pressure"]')!);
    const confirmation = dialogs()[1]!;
    expect(confirmation.textContent).toContain("Revoke Lab2Pressure?");
    expect(confirmation.textContent).toContain("stop working immediately");
    expect(confirmation.textContent).toContain("cannot be undone");
    expect(requests().some((request) => request.method === "DELETE")).toBe(false);

    await click("Revoke", confirmation);
    await settle();

    expect(requests().filter((request) => request.method === "DELETE")).toEqual([
      { method: "DELETE", path: "/api/schema-bookmarks/70/api-keys/1", body: undefined },
    ]);
    expect(keysDialog().textContent).toContain("No API keys yet");
    expect(toasts.success).toHaveBeenCalledWith("Lab2Pressure was revoked");
  });

  test("cancelling the confirmation keeps the key", async () => {
    serve();
    await openKeys();

    await click(keysDialog().querySelector('button[aria-label="Revoke Lab2Pressure"]')!);
    await click("Cancel", dialogs()[1]!);
    await settle();

    expect(requests().some((request) => request.method === "DELETE")).toBe(false);
    expect(keysDialog().textContent).toContain("Lab2Pressure");
  });

  test("a failed revoke shows the API's reason and keeps the key listed", async () => {
    serve({ revoke: refusal(404, "That API key no longer exists.") });
    await openKeys();

    await click(keysDialog().querySelector('button[aria-label="Revoke Lab2Pressure"]')!);
    await click("Revoke", dialogs()[1]!);
    await settle();

    expect(keysDialog().textContent).toContain("That API key no longer exists.");
    expect(keysDialog().textContent).toContain("mls_AbC12345…");
    expect(toasts.success).not.toHaveBeenCalled();
  });
});

describe("the API docs of a bookmark", () => {
  const docsFor = (inputSchema: ModelDto["inputSchema"], bindingCount = 1) =>
    buildApiDocs({
      url: "https://mlsuite.test/api/public/model-predictions",
      bookmarkName: "production",
      bindingCount,
      model: { inputSchema },
    });

  test("document every feature of the bound model, with its real outputs", () => {
    const docs = docsFor(signature);

    expect(docs.url).toBe("https://mlsuite.test/api/public/model-predictions");
    expect(docs.request?.features).toEqual([
      { name: "age", type: "number", nullable: false },
      { name: "smoker", type: "boolean", nullable: true },
      {
        name: "city",
        type: 'number (a category; labels such as "Madrid", "Lima" are not accepted)',
        nullable: false,
      },
      { name: "pressure", type: "number (a series reduced to one value)", nullable: true },
      { name: "pressure_max", type: "number (max of a series)", nullable: true },
      { name: "sex__male", type: "number, 1 or 0 (sex is male)", nullable: false },
      { name: "sex__female", type: "number, 1 or 0 (sex is female)", nullable: false },
    ]);
    expect(JSON.parse(docs.request!.example)).toEqual({
      features: {
        age: 0,
        smoker: false,
        city: 0,
        pressure: 0,
        pressure_max: 0,
        sex__male: 1,
        sex__female: 0,
      },
    });
    expect(JSON.parse(docs.response!.example)).toEqual({
      outputs: [{ prediction: "0", probabilities: { "0": 0.8, "1": 0.2 } }],
    });
    expect(docs.curl).toContain('"X-MLSuite-Key: $MLSUITE_API_KEY"');
  });

  test("document one output per report, a regressor by its value", () => {
    const docs = docsFor({
      fields: signature.fields.slice(0, 1),
      reports: [{ kind: "regressor", mappedTo: 0 }, signature.reports[0]],
    });

    expect(JSON.parse(docs.response!.example).outputs).toEqual([
      { value: 0.5 },
      { prediction: "0", probabilities: { "0": 0.8, "1": 0.2 } },
    ]);
  });

  test("the Markdown carries the features, labels, errors and the key placeholder", () => {
    const markdown = apiDocsMarkdown(docsFor(signature));

    expect(markdown).toContain("POST https://mlsuite.test/api/public/model-predictions");
    expect(markdown).toContain("X-MLSuite-Key: <your key>");
    expect(markdown).toContain("| `sex__male` | number, 1 or 0 (sex is male) | No |");
    expect(markdown).toContain('"prediction": "0"');
    for (const status of ["400", "401", "404", "409", "422", "502", "503"]) {
      expect(markdown).toContain(`| ${status} |`);
    }
    expect(markdown).toContain("$MLSUITE_API_KEY");
    expect(markdown).toContain("| Feature | Type | Null allowed |");
    expect(markdown).toContain("Every feature in the table must be present as a key");
    expect(markdown).toContain("at most 64 characters");
    expect(markdown.split("## Errors")[0]).not.toContain("256");
    expect(markdown).toContain("responsibility");
    expect(markdown).not.toContain(SECRET);
  });

  test("a snapshot that does not bind one model gets a notice instead of a contract", () => {
    for (const count of [0, 2]) {
      const docs = docsFor(signature, count);
      expect(docs.notice).toContain("409");
      expect(docs.request).toBeNull();
      expect(docs.response).toBeNull();
      expect(docs.curl).toBeNull();
      expect(apiDocsMarkdown(docs)).toContain("## Not available");
      expect(apiDocsMarkdown(docs)).not.toContain("## Request");
    }
  });

  test("open as a second tab, loaded only when asked for", async () => {
    serve();
    await openKeys();
    expect(requests().map((request) => request.path)).toEqual([
      "/api/schema-bookmarks/70/api-keys",
    ]);

    await click("API docs");
    await settle();

    expect(requests().map((request) => request.path)).toEqual([
      "/api/schema-bookmarks/70/api-keys",
      "/api/schema-versions/9",
      "/api/models/4",
    ]);
    const text = keysDialog().textContent;
    expect(text).toContain(`${window.location.origin}/api/public/model-predictions`);
    expect(text).toContain("X-MLSuite-Key: <your key>");
    expect(keysDialog().querySelector('table[aria-label="Features"]')?.textContent).toContain(
      "sex__female",
    );
    expect(keysDialog().querySelector('[aria-label="Response example"]')?.textContent).toContain(
      '"prediction": "0"',
    );
    expect(keysDialog().querySelector('table[aria-label="Errors"]')?.textContent).toContain(
      "Too many runs are in progress",
    );
  });

  test("copy exactly what the preview documents, never a stored secret", async () => {
    serve();
    await openKeys();
    await create("Edge");
    await click("API docs");
    await settle();

    await click("Copy docs");
    const copied = writeText.mock.lastCall![0];
    expect(copied).toBe(
      apiDocsMarkdown(docsFor(signature, 1)).replaceAll(
        "https://mlsuite.test",
        window.location.origin,
      ),
    );
    expect(toasts.success).toHaveBeenCalledWith("Docs copied");

    await click("Copy cURL");
    const curl = writeText.mock.lastCall![0];
    expect(curl).toContain("$MLSUITE_API_KEY");
    expect(curl).toContain(`${window.location.origin}/api/public/model-predictions`);
    expect(toasts.success).toHaveBeenCalledWith("cURL example copied");
    expect(`${copied}${curl}`).not.toContain(SECRET);
  });

  test("a fresh secret survives a look at the docs", async () => {
    serve();
    await openKeys();
    await create("Edge");

    await click("API docs");
    await settle();
    await click("Keys");

    expect(secretField()?.value).toBe(SECRET);
  });

  test("tell when the snapshot binds several models and offer no cURL", async () => {
    serve({ bindings: [4, 5] });
    await openKeys();

    await click("API docs");
    await settle();

    expect(keysDialog().textContent).toContain("binds 2 models");
    expect(keysDialog().querySelector('table[aria-label="Features"]')).toBeNull();
    expect(requests().some((request) => request.path.startsWith("/api/models/"))).toBe(false);
    expect(buttonByText("Copy cURL", keysDialog())!.disabled).toBe(true);
  });

  test("retry after a failed snapshot reads the snapshot again, never a model without an id", async () => {
    serve({ snapshotFailures: 1 });
    await openKeys();

    await click("API docs");
    await settle();
    expect(keysDialog().textContent).toContain("The snapshot could not be read.");
    expect(requests().some((request) => request.path.startsWith("/api/models/"))).toBe(false);

    await click("Try again");
    await settle();

    expect(requests().filter((request) => request.path === "/api/schema-versions/9")).toHaveLength(
      2,
    );
    expect(requests().filter((request) => request.path.startsWith("/api/models"))).toEqual([
      { method: "GET", path: "/api/models/4", body: undefined },
    ]);
    expect(keysDialog().querySelector('table[aria-label="Features"]')).not.toBeNull();
  });

  test("a recovered snapshot that binds several models shows the notice, not a model error", async () => {
    serve({ snapshotFailures: 1, bindings: [4, 5] });
    await openKeys();

    await click("API docs");
    await settle();
    await click("Try again");
    await settle();

    expect(keysDialog().textContent).toContain("binds 2 models");
    expect(keysDialog().textContent).not.toContain("did not load");
    expect(requests().some((request) => request.path.startsWith("/api/models"))).toBe(false);
  });
});
