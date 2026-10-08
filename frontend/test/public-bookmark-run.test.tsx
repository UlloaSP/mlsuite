// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act, type PropsWithChildren } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SessionFrameLayout } from "@/app/layouts/SessionFrameLayout";
import { PublicBookmarkPage } from "@/features/explore/pages/public-bookmark-page";
import type { PublicBookmarkDto, SchemaBookmarkDto } from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

// The session and the frame are the real ones: only the app shell's chrome is replaced.
vi.mock("@/app/layouts/AppShellLayout", () => ({
  AppShellFrame: ({ children }: PropsWithChildren) => <div data-frame="app-shell">{children}</div>,
}));

const PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";
const AT = "2026-10-01T10:00:00Z";
const ME_PATH = "/api/users/me";
const CONTEXT_PATH = "/api/workspace/context";
const BOOKMARK_PATH = `/api/public/bookmarks/${PUBLIC_ID}`;
const EXAMPLES_PATH = `${BOOKMARK_PATH}/examples`;
const QUOTA_PATH = `${BOOKMARK_PATH}/quota`;
const RUN_PATH = `${BOOKMARK_PATH}/predictions`;
const WORKSPACE_PATH = `/api/schema-bookmarks/public/${PUBLIC_ID}`;

const publicBookmark = (
  age: Record<string, unknown> = { defaultValue: 52 },
): PublicBookmarkDto => ({
  publicId: PUBLIC_ID,
  name: "production",
  description: null,
  publicationNote: null,
  version: 2,
  inputCount: 1,
  reportCount: 1,
  organizationName: "Acme Health",
  organizationLogoUrl: null,
  formSchema: {
    fields: [{ kind: "number", label: "Age", mappedTo: "in0", ...age }],
    reports: [{ kind: "classifier", label: "Risk", id: "out0", mappedTo: "out0" }],
  },
  updatedAt: AT,
});

const workspaceBookmark: SchemaBookmarkDto = {
  id: 70,
  schemaId: 5,
  schemaName: "Risk",
  versionId: 9,
  version: 2,
  versionName: "Baseline",
  name: "production",
  description: null,
  publicationNote: null,
  visibility: "PUBLIC",
  publicId: PUBLIC_ID,
  exampleCount: 0,
  staleExampleCount: 0,
  createdAt: AT,
  updatedAt: AT,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const failure = (status: number, message: string) =>
  json({ status, message, path: RUN_PATH, timestamp: AT }, status);
const classified = (low: number, high: number) =>
  json({
    reports: [
      {
        key: "out0",
        payload: { kind: "classifier", mapping: ["low", "high"], probabilities: [[low, high]] },
      },
    ],
    quota: { limit: 50, remaining: 49, resetsAt: AT },
  });
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 6; turn += 1) await flush();
};

/** Answers by path; a path with several answers gives them in order and repeats the last. */
type Answer = Response | Promise<Response> | Error;
let answers: Record<string, Answer[]>;
let fetchMock: ReturnType<typeof vi.fn>;

const signIn = () => {
  answers[ME_PATH] = [json({ id: 9, email: "member@example.test", systemRole: "USER" })];
  answers[CONTEXT_PATH] = [json({ currentOrganization: { id: 3 }, permissions: {} })];
};

beforeEach(() => {
  answers = {
    [ME_PATH]: [json({ status: 401, message: "Unauthorized", path: ME_PATH, timestamp: AT }, 401)],
    [BOOKMARK_PATH]: [json(publicBookmark())],
    [EXAMPLES_PATH]: [json([])],
    // Plenty of runs left: the quota has its own tests.
    [QUOTA_PATH]: [json({ limit: 50, remaining: 50, resetsAt: null })],
  };
  fetchMock = vi.fn(async (url: string) => {
    const queue = answers[new URL(url).pathname];
    if (!queue) throw new Error(`Unexpected request to ${url}`);
    const answer = queue.length > 1 ? queue.shift()! : queue[0];
    if (answer instanceof Error) throw answer;
    return answer instanceof Response ? answer.clone() : answer;
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function openPage() {
  const view = await mount(
    <Routes>
      <Route element={<SessionFrameLayout />}>
        <Route path="/explore/:publicId" element={<PublicBookmarkPage />} />
      </Route>
    </Routes>,
    {
      route: `/explore/${PUBLIC_ID}`,
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    },
  );
  await settle();
  return view.host;
}

/** MLForm lays the form out as two panes (Inputs, Results) in one element. */
const formRoot = (host: HTMLElement) => host.querySelector("mlf-form")!.shadowRoot!;
async function run(host: HTMLElement) {
  await act(async () =>
    formRoot(host).querySelector("mlf-submit-button")!.shadowRoot!.querySelector("button")!.click(),
  );
  await settle();
}
/** Reports render inside nested shadow roots, which `textContent` does not cross. */
const deepText = (node: Node): string =>
  [...(node instanceof Element && node.shadowRoot ? [node.shadowRoot] : []), ...node.childNodes]
    .map((child) =>
      child.nodeType === Node.TEXT_NODE ? (child.textContent ?? "") : deepText(child),
    )
    .join(" ");
const reportText = (host: HTMLElement) =>
  [...formRoot(host).querySelectorAll("mlf-report-frame")]
    .map(deepText)
    .join(" ")
    .replace(/\s+/g, " ");
const runRequests = () =>
  fetchMock.mock.calls.filter(([url]) => new URL(String(url)).pathname === RUN_PATH);
const requestedPaths = () => fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);
const alertText = (host: HTMLElement) => host.querySelector('[role="alert"]')?.textContent ?? null;

describe("running a public bookmark", () => {
  test("a visitor runs the form in one public request and sees the result, which is not saved", async () => {
    answers[RUN_PATH] = [classified(0.2, 0.8)];
    const host = await openPage();
    expect(host.textContent).toContain("Runs from this page are not saved");
    expect(formRoot(host).querySelectorAll("mlf-field-frame")).toHaveLength(1);

    await run(host);

    expect(runRequests()).toHaveLength(1);
    const [, init] = runRequests()[0];
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(init.body as string)).toEqual({ version: 2, values: { in0: 52 } });
    expect(formRoot(host).querySelectorAll("mlf-report-frame")).toHaveLength(1);
    expect(reportText(host)).toContain("high 80.0 %");
    expect(alertText(host)).toBeNull();
    // After the frame's session probe, only public reads and the run: no model, no saved run.
    expect(requestedPaths()).toEqual([ME_PATH, BOOKMARK_PATH, EXAMPLES_PATH, QUOTA_PATH, RUN_PATH]);
  });

  test("the form is busy while the run is in flight", async () => {
    let finish!: (response: Response) => void;
    answers[RUN_PATH] = [new Promise<Response>((resolve) => (finish = resolve))];
    const host = await openPage();
    const busy = () => host.querySelector("[aria-busy]")?.getAttribute("aria-busy");
    expect(busy()).toBe("false");

    await run(host);
    expect(busy()).toBe("true");

    finish(classified(0.2, 0.8));
    await settle();
    expect(busy()).toBe("false");
    expect(reportText(host)).toContain("high 80.0 %");
  });

  test("running again replaces the result", async () => {
    answers[RUN_PATH] = [classified(0.2, 0.8), classified(0.9, 0.1)];
    const host = await openPage();

    await run(host);
    expect(reportText(host)).toContain("high 80.0 %");
    await run(host);

    expect(runRequests()).toHaveLength(2);
    expect(formRoot(host).querySelectorAll("mlf-report-frame")).toHaveLength(1);
    expect(reportText(host)).toContain("high 10.0 %");
    expect(reportText(host)).not.toContain("80.0 %");
  });

  test("an input the form rejects is never sent", async () => {
    answers[BOOKMARK_PATH] = [json(publicBookmark({ required: true }))];
    answers[RUN_PATH] = [classified(0.2, 0.8)];
    const host = await openPage();

    await run(host);

    expect(runRequests()).toHaveLength(0);
    expect(reportText(host)).not.toContain("80.0 %");
  });

  test.each([
    [
      400,
      'The form has no input "in9".',
      "These values could not be run",
      'The form has no input "in9".',
    ],
    [
      422,
      "The models could not use these values. Check the inputs and try again.",
      "These values could not be run",
      "Check the inputs and try again.",
    ],
    [
      409,
      "This bookmark changed after the page was loaded. Reload the page and run it again.",
      "This form cannot be run right now",
      "Reload the page and run it again.",
    ],
    [
      404,
      "Public bookmark not found",
      "This bookmark is no longer public",
      "unpublished or removed",
    ],
    [
      503,
      "Too many public runs are in progress. Try again in a moment.",
      "The models are busy",
      "Try again in a moment.",
    ],
    [502, "Traceback: /srv/models/risk.joblib", "The run failed", "Try again later."],
    [500, "Unexpected error", "The run failed", "Try again later."],
  ])("a run answered %i is explained where it happened", async (status, message, title, detail) => {
    answers[RUN_PATH] = [failure(status, message), classified(0.2, 0.8)];
    const host = await openPage();

    await run(host);

    expect(alertText(host)).toContain(title);
    expect(alertText(host)).toContain(detail);
    expect(host.textContent).not.toContain("Traceback");
    // The form and its values stay, so the visitor can run again; a new run clears the alert.
    expect(formRoot(host).querySelectorAll("mlf-field-frame")).toHaveLength(1);
    await run(host);
    expect(alertText(host)).toBeNull();
    expect(reportText(host)).toContain("high 80.0 %");
  });

  test("a run that never reaches the server says so", async () => {
    answers[RUN_PATH] = [new Error("offline")];
    const host = await openPage();

    await run(host);

    expect(alertText(host)).toContain("The run did not reach the server");
  });

  test("a form that needs plugin fields or reports is not mounted", async () => {
    answers[BOOKMARK_PATH] = [
      json({
        ...publicBookmark(),
        formSchema: {
          fields: [{ kind: "number", label: "Age", mappedTo: "in0" }],
          reports: [{ kind: "Crystal Tree", id: "out0", mappedTo: "out0" }],
        },
      }),
    ];
    const host = await openPage();

    expect(host.textContent).toContain("This form cannot be shown here");
    expect(host.querySelector("mlf-form")).toBeNull();
  });
});

describe("the way from a public page into its workspace", () => {
  const link = (host: HTMLElement) =>
    [...host.querySelectorAll("a")].find(
      (item) => item.textContent?.trim() === "Open in workspace",
    );

  test("an anonymous visitor gets no link, and the page asks for the session only once", async () => {
    const host = await openPage();
    await settle();

    expect(host.querySelector('[data-frame="app-shell"]')).toBeNull();
    expect(host.querySelector("mlf-form")).not.toBeNull();
    expect(link(host)).toBeUndefined();
    // The failed session probe is not repeated by the page, and no workspace is asked.
    expect(requestedPaths()).toEqual([ME_PATH, BOOKMARK_PATH, EXAMPLES_PATH, QUOTA_PATH]);
  });

  test("a member of the owning organization can open the bookmark where runs are saved", async () => {
    signIn();
    answers[WORKSPACE_PATH] = [json(workspaceBookmark)];
    const host = await openPage();

    expect(host.querySelector('[data-frame="app-shell"]')).not.toBeNull();
    expect(link(host)?.getAttribute("href")).toBe("/predict/70");
  });

  test("a signed-in member of another organization sees the same page without the link", async () => {
    signIn();
    answers[WORKSPACE_PATH] = [
      json(
        { status: 404, message: "Schema bookmark not found", path: WORKSPACE_PATH, timestamp: AT },
        404,
      ),
    ];
    answers[RUN_PATH] = [classified(0.2, 0.8)];
    const host = await openPage();

    expect(requestedPaths()).toContain(WORKSPACE_PATH);
    expect(link(host)).toBeUndefined();
    await run(host);
    expect(reportText(host)).toContain("high 80.0 %");
  });
});
