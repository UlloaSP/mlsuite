// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { PurgeDialog } from "@/capabilities/purge/PurgeDialog";
import { click, mount } from "./support/dom";

const preview = {
  scope: "MODEL",
  targetId: 9,
  targetLabel: "risk-forest",
  confirmation: "risk-forest",
  counts: { runs: 1200, results: 1200, reviews: 0, preparedVersions: 3 },
  refusal: null as string | null,
};

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

const answer = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    String(url).includes("/preview") ? answer(preview) : answer({ id: 1 }, 202),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  preview.refusal = null;
});

const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

const open = async (onClose = vi.fn()) => {
  await mount(
    <QueryClientProvider client={new QueryClient()}>
      <PurgeDialog scope="MODEL" targetId={9} onClose={onClose} />
    </QueryClientProvider>,
  );
  await settle();
  return onClose;
};

const purgeButton = () =>
  [...document.querySelectorAll("button")].find(
    (button) => button.textContent === "Purge permanently",
  )!;

const field = () => document.querySelector<HTMLInputElement>('[role="dialog"] input');

const type = (value: string) =>
  act(() => {
    const input = field()!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

test("shows what would really be destroyed, without what the purge leaves alone", async () => {
  await open();
  const text = document.querySelector('[role="dialog"]')!.textContent;

  expect(text).toContain("Inferences");
  expect(text).toContain((1200).toLocaleString());
  expect(text).not.toContain("Reviews");
  expect(text).not.toContain("prepared");
});

test("asks for the target's exact name before it can start", async () => {
  const onClose = await open();

  expect(purgeButton().disabled).toBe(true);
  await type("risk-fores");
  expect(purgeButton().disabled).toBe(true);
  await type("risk-forest");
  expect(purgeButton().disabled).toBe(false);

  await click(purgeButton());
  await settle();

  expect(onClose).toHaveBeenCalled();
  const [, init] = fetchMock.mock.calls.find(([, call]) => call?.method === "POST")!;
  expect(JSON.parse(String(init?.body))).toEqual({
    scope: "MODEL",
    targetId: 9,
    confirmation: "risk-forest",
  });
});

test("a refused purge says why and offers no way to confirm", async () => {
  preview.refusal = "This account is the only owner of Acme.";
  await open();

  expect(document.querySelector('[role="dialog"]')!.textContent).toContain(preview.refusal);
  expect(field()).toBeNull();
  expect(purgeButton().disabled).toBe(true);
});
