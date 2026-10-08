// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act, type PropsWithChildren } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SessionFrameLayout } from "@/app/layouts/SessionFrameLayout";
import { PublicBookmarkPage } from "@/features/explore/pages/public-bookmark-page";
import type { PublicBookmarkDto, PublicRunQuotaDto } from "@/shared/api/openapi.gen";
import { formatTimestamp } from "@/shared/lib/date-time";
import { mount } from "./support/dom";

// The session and the frame are the real ones: only the app shell's chrome is replaced.
vi.mock("@/app/layouts/AppShellLayout", () => ({
  AppShellFrame: ({ children }: PropsWithChildren) => <div data-frame="app-shell">{children}</div>,
}));

const PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";
const AT = "2026-10-01T10:00:00Z";
const RESETS_AT = "2026-10-07T14:32:00Z";
const ME_PATH = "/api/users/me";
const CONTEXT_PATH = "/api/workspace/context";
const BOOKMARK_PATH = `/api/public/bookmarks/${PUBLIC_ID}`;
const EXAMPLES_PATH = `${BOOKMARK_PATH}/examples`;
const QUOTA_PATH = `${BOOKMARK_PATH}/quota`;
const RUNS_PATH = `${BOOKMARK_PATH}/runs`;
const RUN_PATH = `${BOOKMARK_PATH}/predictions`;
const WORKSPACE_PATH = `/api/schema-bookmarks/public/${PUBLIC_ID}`;
const PAGE = `/explore/${PUBLIC_ID}`;

const bookmark: PublicBookmarkDto = {
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
    fields: [{ kind: "number", label: "Age", mappedTo: "in0", defaultValue: 52 }],
    reports: [{ kind: "classifier", label: "Risk", id: "out0", mappedTo: "out0" }],
  },
  updatedAt: AT,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const left = (remaining: number, limit = 3): PublicRunQuotaDto => ({
  limit,
  remaining,
  resetsAt: remaining === limit ? null : RESETS_AT,
});
let runIds = 0;
const ran = (quota: PublicRunQuotaDto, high = 0.8) =>
  json({
    run: {
      id: (runIds += 1),
      version: 2,
      createdAt: AT,
      inputs: { Age: 52 },
      feedback: [],
      reports: [
        {
          key: "out0",
          payload: {
            kind: "classifier",
            mapping: ["low", "high"],
            probabilities: [[1 - high, high]],
          },
        },
      ],
    },
    quota,
  });
const refused = (code: string, limit: number) =>
  json(
    {
      status: 429,
      message: "You have used every run.",
      path: RUN_PATH,
      timestamp: AT,
      code,
      quota: left(0, limit),
    },
    429,
  );
const failed = (status: number) =>
  json({ status, message: "Refused", path: RUN_PATH, timestamp: AT }, status);
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 6; turn += 1) await flush();
};

/** Answers by path; a path with several answers gives them in order and repeats the last. */
let answers: Record<string, Response[]>;
let fetchMock: ReturnType<typeof vi.fn>;

const signIn = () => {
  answers[ME_PATH] = [json({ id: 9, email: "member@example.test", systemRole: "USER" })];
  answers[CONTEXT_PATH] = [json({ currentOrganization: { id: 3 }, permissions: {} })];
  answers[WORKSPACE_PATH] = [
    json({ status: 404, message: "Not found", path: WORKSPACE_PATH, timestamp: AT }, 404),
  ];
};

beforeEach(() => {
  answers = {
    [ME_PATH]: [json({ status: 401, message: "Unauthorized", path: ME_PATH, timestamp: AT }, 401)],
    [BOOKMARK_PATH]: [json(bookmark)],
    [EXAMPLES_PATH]: [json([])],
    [RUNS_PATH]: [json([])],
    [QUOTA_PATH]: [json(left(3))],
  };
  fetchMock = vi.fn(async (url: string) => {
    const queue = answers[new URL(url).pathname];
    if (!queue) throw new Error(`Unexpected request to ${url}`);
    return (queue.length > 1 ? queue.shift()! : queue[0]).clone();
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
      route: PAGE,
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    },
  );
  await settle();
  return view.host;
}

/** MLForm lays the form out as two panes (Inputs, Results) in one element. */
const form = (host: HTMLElement) => host.querySelector("mlf-kit-tabs")!;
const formRoot = (host: HTMLElement) => form(host).shadowRoot!;
async function run(host: HTMLElement) {
  await act(async () => formRoot(host).querySelector<HTMLButtonElement>(".btn-submit")!.click());
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
const requests = (path: string) =>
  fetchMock.mock.calls.filter(([url]) => new URL(String(url)).pathname === path);
/** The form's section, without the header of the frame, which has its own account links. */
const formSection = (host: HTMLElement) => host.querySelector('section[aria-label="Form"]')!;
const sectionText = (host: HTMLElement) => formSection(host).textContent!.replace(/\s+/g, " ");
const sectionLinks = (host: HTMLElement) =>
  Object.fromEntries(
    [...formSection(host).querySelectorAll("a")].map((link) => [
      link.textContent!.trim(),
      link.getAttribute("href"),
    ]),
  );
const runWithheld = (host: HTMLElement) => form(host).hasAttribute("data-run-withheld");
const backHere = `returnTo=${encodeURIComponent(PAGE)}`;

describe("the runs a visitor without a session has left", () => {
  test("the count is the server's before the first run and after each one", async () => {
    answers[RUN_PATH] = [ran(left(2)), ran(left(1))];
    const host = await openPage();

    expect(sectionText(host)).toContain(
      "3 of 3 runs left in 24 hours. Sign in for a higher limit.",
    );
    expect(sectionLinks(host)).toEqual({ "Sign in": `/login?${backHere}` });
    expect(runWithheld(host)).toBe(false);

    await run(host);
    expect(sectionText(host)).toContain(`2 of 3 runs left until ${formatTimestamp(RESETS_AT)}.`);
    await run(host);
    expect(sectionText(host)).toContain("1 of 3 runs left");
    // The count comes from each run's answer: it is asked for once, when the page opens.
    expect(requests(QUOTA_PATH)).toHaveLength(1);
  });

  test("the last run leaves its result and the form, and offers an account instead of Run", async () => {
    answers[QUOTA_PATH] = [json(left(1))];
    answers[RUN_PATH] = [ran(left(0))];
    const host = await openPage();
    const mounted = form(host);

    await run(host);

    // The same mounted form: its values were not reset, and its result is still shown.
    expect(form(host)).toBe(mounted);
    expect(reportText(host)).toContain("high 80.0 %");
    expect(runWithheld(host)).toBe(true);
    const notice = formSection(host).querySelector('[role="status"]')!;
    expect(notice.textContent).toContain("Sign in to continue");
    expect(notice.textContent).toContain(
      "You have used the 3 runs this bookmark allows without an account. An account has a higher limit.",
    );
    expect(notice.textContent).toContain(
      `You can run it again after ${formatTimestamp(RESETS_AT)}.`,
    );
    expect(sectionLinks(host)).toEqual({
      "Sign in": `/login?${backHere}`,
      "Create account": `/login?${backHere}&mode=register`,
    });
    expect(host.querySelector('[role="alert"]')).toBeNull();
    // Nothing is sent while no run is left, however the form is submitted.
    await run(host);
    expect(requests(RUN_PATH)).toHaveLength(1);
    expect(reportText(host)).toContain("high 80.0 %");
  });

  test("a page opened with no run left never offers Run", async () => {
    answers[QUOTA_PATH] = [json(left(0))];
    const host = await openPage();

    expect(runWithheld(host)).toBe(true);
    expect(sectionText(host)).toContain("Sign in to continue");
    expect(formRoot(host).querySelectorAll("mlf-field-frame")).toHaveLength(1);
  });

  test("a run the server refuses for the limit keeps the shown result and is not an error", async () => {
    // Another tab used the remaining runs after this page read the count.
    answers[RUN_PATH] = [ran(left(1)), refused("ANONYMOUS_RUN_LIMIT_REACHED", 3)];
    const host = await openPage();
    await run(host);

    await run(host);

    expect(requests(RUN_PATH)).toHaveLength(2);
    expect(runWithheld(host)).toBe(true);
    expect(sectionText(host)).toContain("Sign in to continue");
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(reportText(host)).toContain("high 80.0 %");
  });

  test("after a run that failed the count is asked again, since some refusals count", async () => {
    answers[QUOTA_PATH] = [json(left(3)), json(left(2))];
    answers[RUN_PATH] = [failed(422)];
    const host = await openPage();

    await run(host);

    expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not be run");
    expect(requests(QUOTA_PATH)).toHaveLength(2);
    expect(sectionText(host)).toContain("2 of 3 runs left");
    expect(runWithheld(host)).toBe(false);
  });

  test("a count that cannot be read is not invented, and the form still runs", async () => {
    answers[QUOTA_PATH] = [failed(500)];
    answers[RUN_PATH] = [ran(left(2))];
    const host = await openPage();

    expect(sectionText(host)).not.toContain("runs left");
    expect(runWithheld(host)).toBe(false);
    await run(host);
    expect(sectionText(host)).toContain("2 of 3 runs left");
  });
});

describe("the runs a signed-in member has left", () => {
  test("the member sees their own count and no invitation to sign in", async () => {
    signIn();
    answers[QUOTA_PATH] = [json(left(5, 5))];
    answers[RUN_PATH] = [ran(left(4, 5))];
    const host = await openPage();

    expect(host.querySelector('[data-frame="app-shell"]')).not.toBeNull();
    expect(sectionText(host)).toContain("5 of 5 runs left in 24 hours.");
    expect(sectionLinks(host)).toEqual({});

    await run(host);
    expect(sectionText(host)).toContain(`4 of 5 runs left until ${formatTimestamp(RESETS_AT)}.`);
  });

  test("with no run left the member is told when the count starts again", async () => {
    signIn();
    answers[QUOTA_PATH] = [json(left(1, 5))];
    answers[RUN_PATH] = [ran(left(0, 5))];
    const host = await openPage();

    await run(host);

    expect(runWithheld(host)).toBe(true);
    const notice = formSection(host).querySelector('[role="status"]')!;
    expect(notice.textContent).toContain("You have reached the run limit");
    expect(notice.textContent).toContain(
      `You have used your 5 runs of this bookmark. You can run it again after ${formatTimestamp(RESETS_AT)}.`,
    );
    expect(sectionLinks(host)).toEqual({});
    expect(reportText(host)).toContain("high 80.0 %");
  });
});
