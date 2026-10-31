// @vitest-environment jsdom

import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { AlertsView } from "@/features/infrastructure/components/AlertsView";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";
import type { SystemAlertDto, SystemAlertsDto } from "@/shared/api/openapi.gen";
import { formatMeasure } from "@/shared/lib/format-measure";
import { mount } from "./support/dom";

const alert = (overrides: Partial<SystemAlertDto>): SystemAlertDto => ({
  id: 1,
  signal: "HOST_CPU",
  label: "CPU",
  unit: "%",
  severity: "WARNING",
  value: 87.5,
  threshold: 85,
  latestValue: 91,
  raisedAt: "2026-10-31T10:00:00Z",
  resolvedAt: null,
  ...overrides,
});

const calm: SystemAlertsDto = {
  sampledAt: "2026-10-31T10:05:00Z",
  opsAgentReporting: true,
  signals: [
    {
      signal: "HOST_CPU",
      label: "CPU",
      unit: "%",
      value: 12,
      warningThreshold: 85,
      criticalThreshold: 95,
      clearThreshold: 70,
    },
    {
      signal: "OPS_AGENT",
      label: "Ops agent not reporting",
      unit: "",
      value: 0,
      warningThreshold: 1,
      criticalThreshold: null,
      clearThreshold: 1,
    },
  ],
  open: [],
  recent: [],
};

const overview = {
  services: [{ name: "spring-app", status: "running", health: "healthy", terminalEnabled: false }],
} as unknown as InfrastructureOverviewDto;

let respond: () => Promise<Response>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function render(props: { overview?: InfrastructureOverviewDto } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await mount(<AlertsView overview={props.overview} streamConnected />, {
    route: "/admin/infrastructure?tab=alerts",
    queryClient: client,
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve));
  });
  return view.host;
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => respond()),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a measure", () => {
  test("reads with its unit", () => {
    expect(formatMeasure(12.34, "%")).toBe("12.3%");
    expect(formatMeasure(1, "tasks")).toBe("1 task");
    expect(formatMeasure(2, "tasks")).toBe("2 tasks");
    expect(formatMeasure(1, "per minute")).toBe("1 per minute");
    expect(formatMeasure(1, "")).toBe("1");
  });
});

describe("the alerts page", () => {
  test("shows a loading state until the alerts arrive, never an empty list", async () => {
    respond = () => new Promise(() => undefined);

    const host = await render();

    expect(host.textContent).toContain("Loading alerts…");
    expect(host.textContent).not.toContain("No open alerts");
  });

  test("says nothing is open and lists what the signals read", async () => {
    respond = async () => json(calm);

    const host = await render();

    expect(host.textContent).toContain("0 alerts open on the platform.");
    expect(host.textContent).toContain("No open alerts");
    expect(host.textContent).toContain("Nothing has stayed over its thresholds.");
    const signals = host.querySelector('section[aria-label="Signals"]')!;
    const cpu = [...signals.querySelectorAll("tbody tr")][0];
    expect([...cpu.children].map((cell) => cell.textContent)).toEqual([
      "CPU",
      "12%",
      "85%",
      "95%",
      "70%",
    ]);
    const agent = [...signals.querySelectorAll("tbody tr")][1];
    expect([...agent.children].map((cell) => cell.textContent)).toEqual([
      "Ops agent not reporting",
      "No",
      "—",
      "—",
      "—",
    ]);
    expect(host.querySelector('section[aria-label="Recently resolved"]')).toBeNull();
  });

  test("draws open and resolved alerts from what the API stored", async () => {
    respond = async () =>
      json({
        ...calm,
        open: [alert({ severity: "CRITICAL" })],
        recent: [alert({ id: 2, resolvedAt: "2026-10-31T09:00:00Z", latestValue: 40 })],
      });

    const host = await render();

    expect(host.textContent).toContain("1 alert open on the platform.");
    const open = host.querySelector('section[aria-label="Open"]')!;
    expect(open.textContent).toContain("Critical");
    expect(open.textContent).toContain("Reached 87.5%, threshold 85% · now 91%");
    expect(open.textContent).not.toContain("Resolved");
    const resolved = host.querySelector('section[aria-label="Recently resolved"]')!;
    expect(resolved.textContent).toContain("Warning");
    expect(resolved.textContent).toContain("ended at 40%");
    expect(resolved.textContent).toContain("Resolved ");
  });

  test("a state quotes no numbers", async () => {
    respond = async () =>
      json({
        ...calm,
        open: [alert({ signal: "OPS_AGENT", label: "Ops agent not reporting", unit: "" })],
      });

    const open = (await render()).querySelector('section[aria-label="Open"]')!;

    expect(open.textContent).toContain("Ops agent not reporting");
    expect(open.textContent).not.toContain("Reached");
  });

  test("an unreachable ops agent is told apart from all clear, and needs no overview", async () => {
    respond = async () =>
      json({
        ...calm,
        opsAgentReporting: false,
        signals: [{ ...calm.signals[0], value: null }],
      });

    const host = await render();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "The ops agent is not reporting",
    );
    expect(host.textContent).toContain("Nothing that can be measured has stayed");
    expect(host.querySelector('section[aria-label="Signals"] tbody')?.textContent).toContain(
      "Unknown",
    );
    expect(host.querySelector('section[aria-label="Live service state"]')).toBeNull();
  });

  test("a failed read says so and retries", async () => {
    respond = async () => json({ status: 500, message: "The server failed" }, 500);

    const host = await render();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not be read");
    expect(host.textContent).not.toContain("No open alerts");

    respond = async () => json(calm);
    await act(async () => {
      [...host.querySelectorAll("button")]
        .find((button) => button.textContent === "Retry")
        ?.click();
      await new Promise((resolve) => setTimeout(resolve));
    });

    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain("No open alerts");
  });

  test("keeps what this page sees live apart from recorded alerts", async () => {
    respond = async () => json(calm);

    const live = (await render({ overview })).querySelector(
      'section[aria-label="Live service state"]',
    )!;

    expect(live.textContent).toContain("Not recorded and not notified.");
    expect(live.textContent).toContain("All managed services stable");
  });
});
