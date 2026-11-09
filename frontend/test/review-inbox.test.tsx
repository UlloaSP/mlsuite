// @vitest-environment jsdom
import { useLocation } from "@tanstack/react-router";
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { ReviewsPage } from "@/features/reviews/pages/reviews-page";
import { formatTimestamp } from "@/shared/lib/date-time";
import { click, mount } from "./support/dom";

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 7,
  useCan: () => false,
}));
vi.mock("@/capabilities/prediction-runtime/mlform/executable-schema", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/capabilities/prediction-runtime/mlform/executable-schema")
    >();
  return {
    // Fixture snapshots carry no form unless a test gives them one.
    toExecutableSchemaVersion: (version: { formSchema?: unknown }) =>
      version.formSchema ? actual.toExecutableSchemaVersion(version as never) : version,
  };
});
vi.mock("@/features/reviews/components/ReviewStepContextPanel", () => ({
  ReviewStepContextPanel: () => null,
}));
// The detail stands in for the review form; clicking it completes the shown item as the form does.
vi.mock("@/features/reviews/components/SchemaReviewRunDetailPanel", async () => {
  const { useCompleteSchemaReviewRunMutation } =
    await import("@/features/reviews/api/review-mutations");
  return {
    SchemaReviewRunDetailPanel: ({
      reviewId,
      reviewRunId,
      onSaved,
    }: {
      reviewId: string;
      reviewRunId: string;
      onSaved?: () => void;
    }) => {
      const completion = useCompleteSchemaReviewRunMutation(reviewId, reviewRunId);
      return (
        <>
          <button type="button" data-testid="detail" onClick={() => completion.mutate()}>
            {reviewRunId}
          </button>
          <button type="button" data-testid="saved" onClick={() => onSaved?.()}>
            saved
          </button>
        </>
      );
    },
  };
});

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
let snapshot: Record<string, unknown>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  inbox = [
    item({ publicId: "saved", reviewId: "r1", reviewState: "IN_PROGRESS" }),
    item({ publicId: "todo-1", reviewId: "r1", reviewState: "PENDING" }),
    item({ publicId: "todo-2", reviewId: "r2", reviewState: "PENDING" }),
  ];
  requests = [];
  snapshot = { id: 1 };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      const path = url.pathname.replace("/api/schema-reviews/inbox", "");
      requests.push(`${path}${url.search}`);
      if (init?.method === "POST" && path === "/submit-pending") {
        inbox = inbox.filter((entry) => entry.reviewState !== "IN_PROGRESS");
        return new Response(null, { status: 204 });
      }
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
      return json({ publicId: path.slice(1), schema: { name: "Risk" }, schemaVersion: snapshot });
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
  const { host } = await mount(<Location />, {
    route,
    routes: {
      "/review": <ReviewsPage />,
      "/review/$reviewId/runs/$reviewRunId": <ReviewsPage />,
    },
  });
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
  // Completing an item moves it from pending to revision while its group is collapsed.
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

test("a review whose snapshot cannot run is shown as such, and the tray stays usable", async () => {
  snapshot = {
    id: 1,
    bindings: [],
    formSchema: { fields: [], reports: [{ label: "Risk", kind: "classifier" }] },
  };
  const host = await openInbox("/review");

  expect(host.textContent).not.toContain("Review unavailable");
  expect(host.textContent).toContain("Review cannot be shown");
  expect(host.textContent).toContain("Schema report 1 falta mappedTo");
  expect(host.querySelector("aside")?.textContent).toContain("Run todo-1");
});

test("a review whose report reads a bare output position opens", async () => {
  snapshot = {
    id: 1,
    bindings: [],
    formSchema: { fields: [], reports: [{ label: "Risk", kind: "classifier", mappedTo: 0 }] },
  };
  const host = await openInbox("/review");

  expect(host.textContent).not.toContain("Review cannot be shown");
  expect(detail(host)).toBe("saved");
});

test("a run with saved feedback shows when the feedback was saved", async () => {
  inbox[0]!.stateEnteredAt = "2026-07-21T09:30:00Z";
  const host = await openInbox("/review");

  const tray = host.querySelector("aside")!.textContent;
  expect(tray).toContain(`Feedback saved · ${formatTimestamp("2026-07-21T09:30:00Z")}`);
  expect(tray).not.toContain(`Feedback saved · ${formatTimestamp("2026-07-20T08:00:00Z")}`);
});

test("completing the review moves off the submitted runs without asking for them again", async () => {
  const host = await openInbox("/review");
  expect(location(host)).toBe("/review/r1/runs/saved");
  requests = [];

  await click("Complete review (1)", host);
  await settle();

  expect(location(host)).toBe("/review/r1/runs/todo-1");
  expect(requests).not.toContain("/r1/runs/saved");
  expect(host.textContent).not.toContain("Review unavailable");
});

test("saving a pending run's answers opens the next run that needs feedback", async () => {
  const host = await openInbox("/review/r1/runs/todo-1");
  expect(detail(host)).toBe("todo-1");

  await click(host.querySelector('[data-testid="saved"]')!);
  await settle();

  expect(location(host)).toBe("/review/r2/runs/todo-2");
});

test("saving a run already in revision keeps it open", async () => {
  const host = await openInbox("/review/r1/runs/saved");

  await click(host.querySelector('[data-testid="saved"]')!);
  await settle();

  expect(location(host)).toBe("/review/r1/runs/saved");
});

test("an empty revision group says saved answers appear there", async () => {
  inbox = inbox.filter((entry) => entry.reviewState === "PENDING");
  const host = await openInbox("/review");

  expect(host.querySelector("aside")?.textContent).toContain(
    "Runs whose answers you save appear here",
  );
});
