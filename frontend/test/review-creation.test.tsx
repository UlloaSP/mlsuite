// @vitest-environment jsdom

import { act } from "react";
import { describe, expect, test, vi } from "vite-plus/test";
import { ReviewCreationButton } from "@/capabilities/review-creation/ReviewCreationButton";
import { buttonByText, click, mount } from "./support/dom";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const candidate = {
  runId: "5",
  name: "case-5",
  createdAt: "2026-10-20T09:00:00Z",
  schemaId: "2",
  versionId: "3",
  groupLabel: "Risk · v1",
};

const reply = (body: unknown, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? {} : { "Content-Type": "application/json" },
  });

const selection = (kind: string) => ({
  hasNext: false,
  items: [kind === "runs" ? { id: "5", title: "case-5" } : { id: "21", title: "Rui Reviewer" }],
  page: 0,
  size: 24,
  totalAvailable: 1,
  totalItems: 1,
});

/** The selection catalogs, and `create` for every POST /api/schema-reviews. */
function serve(create: () => Promise<Response>) {
  const created = vi.fn(create);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname;
      if (path === "/api/schema-reviews") return created();
      const request = JSON.parse(init?.body as string) as { kind: string };
      return reply(selection(request.kind));
    }),
  );
  return created;
}

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

async function openDialog(onCreated = vi.fn()) {
  await mount(
    <ReviewCreationButton
      count={1}
      organizationId={3}
      loadCandidates={async () => [candidate]}
      onCreated={onCreated}
    />,
  );
  await click("Create review");
  await settle();
  // Every inference of the snapshot starts selected; a reviewer is chosen.
  await click("Rui Reviewer");
  return onCreated;
}

describe("review creation", () => {
  test("creates one review however often it is clicked, then hands over", async () => {
    const created = serve(async () => reply(null, 201));
    const onCreated = await openDialog();

    const assign = buttonByText("Assign review")!;
    await act(async () => {
      assign.click();
      assign.click();
    });
    await settle();

    expect(created).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(buttonByText("Assign review")).toBeUndefined();
  });

  test("stays open and cannot be cancelled while the review is being created", async () => {
    let finish!: () => void;
    serve(() => new Promise<Response>((resolve) => (finish = () => resolve(reply(null, 201)))));
    const onCreated = await openDialog();

    await click("Assign review");
    expect(buttonByText("Cancel")?.disabled).toBe(true);
    expect(buttonByText("Assign review")?.disabled).toBe(true);
    expect(onCreated).not.toHaveBeenCalled();

    await act(async () => finish());
    await settle();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  test("says why a review was refused and lets it be sent again", async () => {
    const created = serve(async () =>
      reply({ status: 400, message: "Review expiry must be in the future" }, 400),
    );
    const onCreated = await openDialog();

    await click("Assign review");
    await settle();
    expect(document.body.textContent).toContain(
      "Review creation failed: Review expiry must be in the future",
    );

    await click("Assign review");
    await settle();
    expect(created).toHaveBeenCalledTimes(2);
    expect(onCreated).not.toHaveBeenCalled();
  });
});
