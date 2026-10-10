/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { buttonByText, click, mount } from "./support/dom";
import {
  buildPublicFeedbackSteps,
  isPublicRunReviewed,
  publicFeedbackItems,
} from "@/features/explore/lib/public-feedback-steps";
import { PublicBookmarkPage } from "@/features/explore/pages/public-bookmark-page";
import type { PublicBookmarkDto, PublicRunDto } from "@/shared/api/openapi.gen";

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
const AT = "2026-10-01T10:00:00Z";
const BOOKMARK_PATH = `/api/public/bookmarks/${PUBLIC_ID}`;
const RUNS_PATH = `${BOOKMARK_PATH}/runs/catalog`;
const RUN_PATH = `${BOOKMARK_PATH}/predictions`;
const QUESTIONS = {
  steps: [
    {
      id: "clinical",
      title: "Clinical check",
      fields: [{ id: "agree", kind: "text", label: "Do you agree?" }],
    },
  ],
};

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
    reports: [
      {
        kind: "classifier",
        label: "Risk",
        id: "out0",
        mappedTo: "out0",
        feedbackQuestionnaire: QUESTIONS,
      },
    ],
  },
  updatedAt: AT,
};
const classified = (high: number) => ({
  key: "out0",
  payload: { kind: "classifier", mapping: ["low", "high"], probabilities: [[1 - high, high]] },
});
const run = (id: number, overrides: Partial<PublicRunDto> = {}): PublicRunDto => ({
  id,
  version: 2,
  createdAt: `2026-10-0${id}T10:00:00Z`,
  inputs: { Age: 40 + id },
  reports: [classified(0.8)],
  feedback: [],
  ...overrides,
});
const reviewed = run(2, {
  feedback: [
    { reportKey: "out0", type: "OUTPUT", value: { "output-feedback-assessment": "low" } },
    { reportKey: "out0", type: "EXPLANATION", value: { agree: "Mostly." } },
  ],
});

const pageData = (items: PublicRunDto[]) => ({
  items,
  page: 0,
  size: 24,
  totalItems: items.length,
  hasNext: false,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 6; turn += 1) await flush();
};

let answers: Record<string, Response[]>;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  answers = {
    [BOOKMARK_PATH]: [json(bookmark)],
    [`${BOOKMARK_PATH}/examples/catalog`]: [json(pageData([]))],
    [`${BOOKMARK_PATH}/quota`]: [json({ limit: 50, remaining: 50, resetsAt: null })],
    [RUNS_PATH]: [json(pageData([reviewed, run(1)]))],
  };
  fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url).pathname;
    if (/\/runs\/\d+$/.test(path)) {
      const page = await answers[RUNS_PATH]![0]!.clone().json();
      return json(
        page.items.find((item: PublicRunDto) => item.id === Number(path.split("/").at(-1))),
      );
    }
    const queue = answers[path];
    if (!queue) throw new Error(`Unexpected request to ${url}`);
    return (queue.length > 1 ? queue.shift()! : queue[0]).clone();
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function openPage() {
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
const rail = (host: HTMLElement) => host.querySelector('aside[aria-label="Your runs"]')!;
const entries = (host: HTMLElement) => [
  ...rail(host).querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
];
/** Reports render inside nested shadow roots, which `textContent` does not cross. */
const deepText = (node: Node): string =>
  [...(node instanceof Element && node.shadowRoot ? [node.shadowRoot] : []), ...node.childNodes]
    .map((child) =>
      child.nodeType === Node.TEXT_NODE ? (child.textContent ?? "") : deepText(child),
    )
    .join(" ")
    .replace(/\s+/g, " ");
const formSection = (host: HTMLElement) => host.querySelector('section[aria-label="Form"]')!;

describe("a visitor's runs on a public bookmark", () => {
  test("the runs the server kept for this browser are listed newest first, the reviewed one marked", async () => {
    const host = await openPage();

    expect(rail(host).textContent).toContain("2 kept");
    const rows = entries(host);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain("Reviewed");
    expect(rows[0]?.textContent).toContain("1 result");
    expect(rows[1]?.textContent).not.toContain("Reviewed");
    expect(host.querySelector("mlf-kit-tabs")).not.toBeNull();
  });

  test("opening a run shows its results, its inputs and the review it can be given", async () => {
    const host = await openPage();
    await click(entries(host)[1]!);
    await settle();

    expect(formSection(host).textContent).toContain("Run of");
    expect(deepText(formSection(host))).toContain("high");
    expect(formSection(host).textContent).toContain("Age");
    expect(formSection(host).textContent).toContain("41");
    expect(formSection(host).querySelector('section[aria-label="Review this run"]')).not.toBeNull();
    expect(formSection(host).querySelector('section[aria-label="Your review"]')).toBeNull();
    // The form is kept, hidden, with its values; going back shows it again.
    expect(host.querySelector("mlf-kit-tabs")).not.toBeNull();
    await click("Back to form");
    expect(formSection(host).textContent).not.toContain("Run of");
  });

  test("a reviewed run shows its answers, which can be changed", async () => {
    const host = await openPage();
    await click(entries(host)[0]!);
    await settle();

    const review = formSection(host).querySelector('section[aria-label="Your review"]')!;
    expect(review.textContent).toContain("Risk");
    expect(review.textContent).toContain("low");
    expect(review.textContent).toContain("Do you agree?");
    expect(review.textContent).toContain("Mostly.");
    await click(buttonByText("Edit", review)!);
    expect(formSection(host).querySelector('section[aria-label="Review this run"]')).not.toBeNull();
  });

  test("a run made from the page joins the list, where it is opened to be reviewed", async () => {
    answers[RUN_PATH] = [
      json({
        run: run(3, { inputs: { Age: 52 } }),
        quota: { limit: 50, remaining: 49, resetsAt: AT },
      }),
    ];
    const host = await openPage();
    answers[RUNS_PATH] = [json(pageData([run(3), reviewed, run(1)]))];
    await act(async () =>
      host
        .querySelector("mlf-kit-tabs")!
        .shadowRoot!.querySelector<HTMLButtonElement>(".btn-submit")!
        .click(),
    );
    await settle();

    expect(rail(host).textContent).toContain("3 kept");
    expect(entries(host)[0]?.getAttribute("aria-pressed")).toBe("true");
    // Nothing is added under the form: the run is in Your runs.
    expect(formSection(host).querySelector("[data-kept-run]")).toBeNull();
    await click(entries(host)[0]!);
    await settle();
    expect(formSection(host).textContent).toContain("Run of");
    expect(formSection(host).querySelector('section[aria-label="Review this run"]')).not.toBeNull();
    // The catalog refreshes its server total after a new run.
    expect(
      fetchMock.mock.calls.filter(([url]) => new URL(String(url)).pathname === RUNS_PATH),
    ).toHaveLength(2);
  });

  test("a run of an earlier form keeps its inputs but shows no results here", async () => {
    answers[RUNS_PATH] = [json(pageData([run(4, { version: 1 })]))];
    const host = await openPage();
    await click(entries(host)[0]!);
    await settle();

    expect(formSection(host).textContent).toContain("earlier version of the form");
    expect(formSection(host).textContent).toContain("44");
    expect(formSection(host).querySelector('section[aria-label="Review this run"]')).toBeNull();
    expect(entries(host)[0]?.textContent).not.toContain("Reviewed");
  });
});

describe("the review of a public run", () => {
  test("asks an assessment of each built-in result and the publisher's questions, and splits the answers by report", () => {
    const steps = buildPublicFeedbackSteps(bookmark.formSchema, run(1));
    expect(steps.map((step) => [step.reportKey, step.type, step.title])).toEqual([
      ["out0", "OUTPUT", "Risk"],
      ["out0", "EXPLANATION", "Risk review"],
    ]);
    expect(steps[0]?.description).toBe("Prediction result: high · 80.00%");
    expect(isPublicRunReviewed(steps)).toBe(false);
    expect(isPublicRunReviewed(buildPublicFeedbackSteps(bookmark.formSchema, reviewed))).toBe(true);
    // A report that did not answer is not asked about.
    expect(buildPublicFeedbackSteps(bookmark.formSchema, run(1, { reports: [] }))).toEqual([]);

    expect(
      publicFeedbackItems(steps, {
        "out0-output-output-feedback-assessment": "high",
        "out0-explanation-agree": "Yes",
      }),
    ).toEqual([
      { reportKey: "out0", type: "OUTPUT", value: { "output-feedback-assessment": "high" } },
      { reportKey: "out0", type: "EXPLANATION", value: { agree: "Yes" } },
    ]);
  });
});
