// @vitest-environment jsdom
import { act } from "react";
import { Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { ReviewsPage } from "@/features/reviews/pages/reviews-page";
import { click, mount } from "./support/dom";

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 7,
}));
vi.mock("@/capabilities/prediction-runtime/mlform/executable-schema", () => ({
  toExecutableSchemaVersion: (version: unknown) => version,
}));
vi.mock("@/features/reviews/components/ReviewStepContextPanel", () => ({
  ReviewStepContextPanel: () => null,
}));
vi.mock("@/features/reviews/components/SchemaReviewRunDetailPanel", () => ({
  SchemaReviewRunDetailPanel: ({
    reviewRunId,
    onReviewChanged,
  }: {
    reviewRunId: string;
    onReviewChanged: () => void;
  }) => (
    <button type="button" data-testid="detail" onClick={onReviewChanged}>
      {reviewRunId}
    </button>
  ),
}));

type Item = { publicId: string; reviewId: string; reviewState: "PENDING" | "IN_PROGRESS" };
const item = ({ publicId, reviewId, reviewState }: Item) => ({
  publicId,
  reviewId,
  reviewState,
  schemaName: "Risk",
  stateEnteredAt: "2026-07-20T08:00:00Z",
  submittedAt: null,
  run: { id: 1, name: `Run ${publicId}`, createdAt: "2026-07-20T08:00:00Z" },
});
let inbox: ReturnType<typeof item>[];
let requests: string[];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  inbox = [
    item({ publicId: "saved", reviewId: "r1", reviewState: "IN_PROGRESS" }),
    item({ publicId: "todo-1", reviewId: "r1", reviewState: "PENDING" }),
    item({ publicId: "todo-2", reviewId: "r2", reviewState: "PENDING" }),
  ];
  requests = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input);
      const path = url.pathname.replace("/api/schema-reviews/inbox", "");
      requests.push(`${path}${url.search}`);
      if (path === "/runs/catalog") {
        const filter = url.searchParams.get("filter");
        const items = inbox.filter((entry) => filter === "all" || entry.reviewState === filter);
        return json({
          items,
          page: 0,
          size: 24,
          totalItems: items.length,
          hasNext: false,
          revisionCount: inbox.filter((entry) => entry.reviewState === "IN_PROGRESS").length,
          pendingCount: inbox.filter((entry) => entry.reviewState === "PENDING").length,
        });
      }
      const run = /^\/(\w+)\/runs\/([\w-]+)$/.exec(path);
      if (run) {
        const found = inbox.find((entry) => entry.reviewId === run[1] && entry.publicId === run[2]);
        return found ? json(found) : json({ status: 404, message: "Review run not found" }, 404);
      }
      return json({ publicId: path.slice(1), schema: { name: "Risk" }, schemaVersion: { id: 1 } });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}
const settle = async () => {
  for (let turn = 0; turn < 8; turn += 1)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
async function openInbox(route: string) {
  const { host } = await mount(
    <>
      <Location />
      <Routes>
        <Route path="/review" element={<ReviewsPage />} />
        <Route path="/review/:reviewId/runs/:reviewRunId" element={<ReviewsPage />} />
      </Routes>
    </>,
    { route },
  );
  await settle();
  // The loading state is held briefly once shown; wait it out.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 500)));
  await settle();
  return host;
}
const location = (host: HTMLElement) => host.querySelector('[data-testid="location"]')?.textContent;
const detail = (host: HTMLElement) => host.querySelector('[data-testid="detail"]')?.textContent;

test("a link to a run that is no longer in the inbox moves on to the next one", async () => {
  const host = await openInbox("/review/r1/runs/completed-earlier");

  expect(host.textContent).not.toContain("Review unavailable");
  expect(location(host)).toBe("/review/r1/runs/saved");
  expect(detail(host)).toBe("saved");
});

test("opening a tray item keeps the tray mounted and asks for nothing it already holds", async () => {
  const host = await openInbox("/review");
  expect(location(host)).toBe("/review/r1/runs/saved");
  const tray = host.querySelector("aside");
  requests = [];

  await click(
    [...host.querySelectorAll("button")].find((node) => node.textContent?.includes("Run todo-1"))!,
  );
  // No waiting: the detail swaps in the same turn, on data the tray already had.
  expect(location(host)).toBe("/review/r1/runs/todo-1");
  expect(detail(host)).toBe("todo-1");
  expect(host.querySelector("aside")).toBe(tray);
  expect(host.textContent).not.toContain("Loading review inbox");
});

test("group counts are the server's, also for a collapsed group", async () => {
  const host = await openInbox("/review");
  const pending = () =>
    [...host.querySelectorAll("section")].find((node) => node.textContent?.includes("Pending"))!;

  expect(pending().textContent).toContain("Needs feedback2");
  await click(pending().querySelector('button[aria-label="Collapse Pending"]')!);
  // Saving feedback moves an item from pending to revision while its group is collapsed.
  inbox[1]!.reviewState = "IN_PROGRESS";
  await click(host.querySelector('[data-testid="detail"]')!);
  await settle();

  expect(pending().textContent).toContain("Needs feedback1");
  expect(host.textContent).toContain("Complete review (2)");
});

test("an empty inbox says so", async () => {
  inbox = [];
  const host = await openInbox("/review");

  expect(host.textContent).toContain("Inbox clear");
});
