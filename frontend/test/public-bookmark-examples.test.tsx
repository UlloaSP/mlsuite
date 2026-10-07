// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { PublicBookmarkPage } from "@/features/explore/pages/public-bookmark-page";
import { RunPublicExampleControl } from "@/features/schemas/components/RunPublicExampleControl";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import type {
  PublicBookmarkDto,
  PublicBookmarkExampleDto,
  SchemaBookmarkDto,
  SchemaBookmarkExampleDto,
} from "@/shared/api/openapi.gen";
import { predictionRun } from "./support/api-fixtures";
import { buttonByText, changeValue, click, mount } from "./support/dom";

const session = vi.hoisted(() => ({ canPublish: false }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  // The public page is opened without a session here, so no workspace is cached.
  useWorkspaceContext: () => ({ data: undefined }),
  useCurrentOrganizationId: () => 3,
  useCan: (permission: string) => permission === "canPublishBookmarks" && session.canPublish,
}));

const PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";
const AT = "2026-10-01T10:00:00Z";
const BOOKMARK_ID = 70;
const PINNED_VERSION_ID = 9;

const bookmark = (overrides: Partial<SchemaBookmarkDto> = {}): SchemaBookmarkDto => ({
  id: BOOKMARK_ID,
  schemaId: 5,
  schemaName: "Risk",
  versionId: PINNED_VERSION_ID,
  version: 2,
  versionName: "Baseline",
  name: "production",
  description: null,
  visibility: "PUBLIC",
  publicId: PUBLIC_ID,
  exampleCount: 0,
  staleExampleCount: 0,
  createdAt: AT,
  updatedAt: AT,
  ...overrides,
});

const marked = (
  runId: number,
  runName: string,
  status: SchemaBookmarkExampleDto["status"] = "SERVED",
): SchemaBookmarkExampleDto => ({
  runId,
  runName,
  runVersion: status === "BOOKMARK_MOVED" ? 1 : 2,
  runVersionName: status === "BOOKMARK_MOVED" ? "First" : "Baseline",
  status,
});

const run = (id: number, schemaVersionId = PINNED_VERSION_ID) =>
  predictionRun({ id, name: `case-${id}`, schemaBookmarkId: BOOKMARK_ID, schemaVersionId });

const FORM_SCHEMA = {
  fields: [
    { kind: "number", label: "Age", mappedTo: "in0" },
    { kind: "text", label: "Notes", mappedTo: "in1" },
  ],
  reports: [{ kind: "regressor", label: "Score", id: "out0", mappedTo: "out0" }],
};
const publicBookmark: PublicBookmarkDto = {
  publicId: PUBLIC_ID,
  name: "production",
  description: null,
  version: 2,
  inputCount: 2,
  reportCount: 1,
  organizationName: "Acme Health",
  formSchema: FORM_SCHEMA,
  updatedAt: AT,
};

/** What the API holds; the fetch stub below serves and changes it like the real endpoints. */
const server = {
  bookmark: bookmark(),
  examples: [] as SchemaBookmarkExampleDto[],
  publicExamples: [] as PublicBookmarkExampleDto[] | "unavailable",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let requests: string[];
let publicRuns: unknown[];
const respond = (url: unknown, init?: RequestInit): Response => {
  const path = new URL(String(url)).pathname;
  const method = init?.method ?? "GET";
  requests.push(`${method} ${path}`);
  if (path === `/api/public/bookmarks/${PUBLIC_ID}/predictions`) {
    publicRuns.push(JSON.parse(init?.body as string));
    return json({ reports: [], quota: { limit: 50, remaining: 49, resetsAt: AT } });
  }
  if (path === `/api/public/bookmarks/${PUBLIC_ID}/quota`) {
    return json({ limit: 50, remaining: 50, resetsAt: null });
  }
  const example = /^\/api\/schema-bookmarks\/70\/examples\/(\d+)$/.exec(path);
  if (example) {
    const runId = Number(example[1]);
    server.examples = server.examples.filter((item) => item.runId !== runId);
    if (method === "DELETE") return new Response(null, { status: 204 });
    const dto = marked(runId, `case-${runId}`);
    server.examples.push(dto);
    return json(dto);
  }
  if (path === "/api/schema-bookmarks/70/examples") return json(server.examples);
  if (path === "/api/schema-bookmarks/70") return json(server.bookmark);
  if (path === `/api/public/bookmarks/${PUBLIC_ID}`) return json(publicBookmark);
  if (path === `/api/public/bookmarks/${PUBLIC_ID}/examples`) {
    return server.publicExamples === "unavailable"
      ? json({ status: 500, message: "Unavailable", path, timestamp: AT }, 500)
      : json(server.publicExamples);
  }
  return json({ status: 404, message: "Not found", path, timestamp: AT }, 404);
};

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 6; turn += 1) await flush();
};
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
const changes = () => requests.filter((request) => !request.startsWith("GET "));

beforeEach(() => {
  session.canPublish = false;
  Object.assign(server, { bookmark: bookmark(), examples: [], publicExamples: [] });
  publicBookmark.formSchema = FORM_SCHEMA;
  requests = [];
  publicRuns = [];
  vi.stubGlobal("fetch", (url: unknown, init?: RequestInit) => Promise.resolve(respond(url, init)));
});
afterEach(() => vi.unstubAllGlobals());

describe("marking a saved run as a public example", () => {
  const control = async (runId: number, schemaVersionId?: number) => {
    const view = await mount(<RunPublicExampleControl run={run(runId, schemaVersionId)} />, {
      route: "/",
      queryClient: newClient(),
    });
    await settle();
    return view.host;
  };

  test("a member who may publish marks a run after confirming, and removes it again", async () => {
    session.canPublish = true;
    const host = await control(500);
    expect(host.textContent).toBe("Mark as public example");

    await click("Mark as public example", host);
    expect(document.body.textContent).toContain("anyone can load this run's name");
    expect(changes()).toEqual([]);
    await click("Mark as example");
    await settle();

    expect(changes()).toEqual(["PUT /api/schema-bookmarks/70/examples/500"]);
    expect(host.textContent).toContain("Public exampleServed");
    expect(buttonByText("Mark as public example", host)).toBeUndefined();

    await click("Remove example", host);
    await settle();
    expect(changes()).toEqual([
      "PUT /api/schema-bookmarks/70/examples/500",
      "DELETE /api/schema-bookmarks/70/examples/500",
    ]);
    expect(host.textContent).toBe("Mark as public example");
  });

  test("a member who may not publish sees the state of an example but no action", async () => {
    server.bookmark = bookmark({ visibility: "PRIVATE" });
    server.examples = [marked(500, "case-500", "BOOKMARK_PRIVATE")];

    const example = await control(500);
    expect(example.textContent).toBe("Public exampleNot served: bookmark is private");
    expect(example.querySelectorAll("button")).toHaveLength(0);

    const other = await control(501);
    expect(other.textContent).toBe("");
    expect(changes()).toEqual([]);
  });

  test("after the bookmark moves, its old examples read as not served and old runs cannot be marked", async () => {
    session.canPublish = true;
    server.examples = [marked(500, "case-500", "BOOKMARK_MOVED")];

    const stale = await control(500, 8);
    expect(stale.textContent).toContain("Not served: bookmark moved");
    expect(buttonByText("Remove example", stale)).toBeDefined();

    const unmarked = await control(501, 8);
    const mark = buttonByText("Mark as public example", unmarked);
    expect(mark?.disabled).toBe(true);
    expect(mark?.title).toContain("now points to another snapshot");
  });
});

describe("a bookmark's examples in the schema repository", () => {
  const row = async (dto: SchemaBookmarkDto) => {
    server.bookmark = dto;
    const view = await mount(<SchemaBookmarkCatalogItem bookmark={dto} />, {
      route: "/",
      queryClient: newClient(),
    });
    return view.host;
  };
  const openExamples = async () => {
    const trigger = document.body.querySelector<HTMLButtonElement>(
      '[aria-label="Open actions for production"]',
    );
    // The menu opens from the keyboard in jsdom and renders in a portal on the body.
    await act(async () =>
      trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (node) => node.textContent === "Public examples",
    );
    if (!item) return null;
    await click(item);
    await settle();
    return document.body.querySelector<HTMLElement>('[role="dialog"]');
  };

  test("the row says how many examples the bookmark serves and how many it left behind", async () => {
    const served = await row(bookmark({ exampleCount: 2, staleExampleCount: 1 }));
    expect(served.textContent).toContain("Serves 2 examples");
    expect(served.textContent).toContain("1 example not served since the bookmark moved");

    const none = await row(bookmark());
    expect(none.textContent).toContain("Serves no examples");

    const waiting = await row(bookmark({ visibility: "PRIVATE", exampleCount: 1 }));
    expect(waiting.textContent).toContain("1 example, not served while private");

    const plain = await row(bookmark({ visibility: "PRIVATE" }));
    expect(plain.textContent).not.toContain("example");
  });

  test("the examples list tells served runs from the ones a move left behind", async () => {
    session.canPublish = true;
    server.examples = [marked(500, "Typical case"), marked(400, "Old case", "BOOKMARK_MOVED")];
    await row(bookmark({ exampleCount: 1, staleExampleCount: 1 }));

    const dialog = await openExamples();
    const rows = [...(dialog?.querySelectorAll("li") ?? [])].map((item) => item.textContent);
    expect(rows).toEqual([
      "Typical caseRan on Baseline · v2ServedRemove",
      "Old caseRan on First · v1Not served: bookmark movedRemove",
    ]);
    expect(dialog?.querySelector("a")?.getAttribute("href")).toBe("/inferences/500");

    await click(dialog!.querySelector('[aria-label="Remove Old case from the examples"]')!);
    await settle();
    expect(changes()).toEqual(["DELETE /api/schema-bookmarks/70/examples/400"]);
    expect(dialog?.querySelectorAll("li")).toHaveLength(1);
  });

  test("a member who may not publish reads the list without a way to change it", async () => {
    server.examples = [marked(500, "Typical case")];
    await row(bookmark({ exampleCount: 1 }));

    const dialog = await openExamples();
    expect(dialog?.textContent).toContain("Typical case");
    expect(dialog?.textContent).toContain("Served");
    expect(buttonByText("Remove", dialog!)).toBeUndefined();
  });

  test("without examples, a member who may not publish is offered no examples action", async () => {
    await row(bookmark({ visibility: "PRIVATE", publicId: null }));
    expect(await openExamples()).toBeNull();
  });
});

describe("examples on the public page", () => {
  const typical: PublicBookmarkExampleDto = {
    id: "example-a",
    name: "Typical case",
    // A key the form no longer has is ignored instead of breaking the form.
    inputs: { Age: 52, Notes: "Non-smoker", "Removed field": "left over" },
  };
  const elderly: PublicBookmarkExampleDto = {
    id: "example-b",
    name: "Elderly case",
    inputs: { Age: 81 },
  };

  // jsdom has no layout, so it lacks the scroll method the open select calls on its options.
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  const page = async () => {
    const view = await mount(
      <Routes>
        <Route path="/explore/:publicId" element={<PublicBookmarkPage />} />
      </Routes>,
      { route: `/explore/${PUBLIC_ID}`, queryClient: newClient() },
    );
    await settle();
    return view.host;
  };
  /** The form's inputs in field order; MLForm nests them in shadow roots. */
  const fields = (host: HTMLElement) => {
    const found: HTMLInputElement[] = [];
    const walk = (node: ParentNode) => {
      for (const child of node.children) {
        if (child instanceof HTMLInputElement) found.push(child);
        walk(child);
        if (child.shadowRoot) walk(child.shadowRoot);
      }
    };
    const form = host.querySelector("mlf-form");
    if (form?.shadowRoot) walk(form.shadowRoot);
    return found;
  };
  const values = (host: HTMLElement) => fields(host).map((input) => input.value);
  const selector = (host: HTMLElement) => host.querySelector<HTMLElement>('[role="combobox"]');
  const choose = async (host: HTMLElement, name: string) => {
    // The select opens from the keyboard in jsdom and lists its options in a portal.
    await act(async () =>
      selector(host)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (node) => node.textContent === name,
    );
    if (!option) throw new Error(`No example named "${name}"`);
    await click(option);
    await settle();
  };

  test("a bookmark without examples shows the form and no selector", async () => {
    const host = await page();

    expect(requests).toContain(`GET /api/public/bookmarks/${PUBLIC_ID}/examples`);
    expect(values(host)).toEqual(["", ""]);
    expect(selector(host)).toBeNull();
    expect(host.textContent).not.toContain("example");
  });

  test("choosing an example fills the form, which stays editable, and another replaces it", async () => {
    server.publicExamples = [typical, elderly];
    const host = await page();
    expect(host.textContent).toContain("Start from an example");
    expect(selector(host)?.textContent).toContain("Choose an example");
    expect(values(host)).toEqual(["", ""]);

    await choose(host, "Typical case");
    expect(selector(host)?.textContent).toContain("Typical case");
    expect(values(host)).toEqual(["52", "Non-smoker"]);

    const [age] = fields(host);
    expect(age.disabled || age.readOnly).toBe(false);
    await changeValue(age, "60");
    expect(values(host)).toEqual(["60", "Non-smoker"]);

    // The second example replaces every value, including the ones it does not set.
    await choose(host, "Elderly case");
    expect(values(host)).toEqual(["81", ""]);
    expect(host.querySelectorAll("mlf-form")).toHaveLength(1);
  });

  test("a run submits the example the form was loaded with, and the visitor's edits to it", async () => {
    server.publicExamples = [typical];
    const host = await page();

    await choose(host, "Typical case");
    await changeValue(fields(host)[0], "60");
    const run = host
      .querySelector("mlf-form")
      ?.shadowRoot?.querySelector("mlf-submit-button")
      ?.shadowRoot?.querySelector("button");
    await act(async () => run?.click());
    await settle();

    expect(publicRuns).toEqual([{ version: 2, values: { in0: 60, in1: "Non-smoker" } }]);
  });

  test("a form that cannot be shown offers no examples either", async () => {
    server.publicExamples = [typical];
    publicBookmark.formSchema = { fields: [{ kind: "body-map", label: "Pain" }] };
    const host = await page();

    expect(host.textContent).toContain("This form cannot be shown here");
    expect(selector(host)).toBeNull();
  });

  test("when the examples cannot be loaded the form is still there, without a selector", async () => {
    server.publicExamples = "unavailable";
    const host = await page();

    expect(host.querySelector("h1")?.textContent).toBe("production");
    expect(values(host)).toEqual(["", ""]);
    expect(selector(host)).toBeNull();
  });
});
