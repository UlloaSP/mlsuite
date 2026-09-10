import { serviceHealthCategory } from "@/features/infrastructure/lib/status";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  buildDashboardAlerts,
  countHealthyServices,
  countProblemServices,
  getOverviewTimestamp,
} from "@/features/infrastructure/lib/dashboard-summary";
import {
  appendLogLine,
  confirmServiceAction,
  applyInfrastructureEvent,
  resolveSelectedService,
} from "@/features/infrastructure/lib/infrastructure-state";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";
import { buildWebSocketUrl } from "@/features/infrastructure/lib/infrastructure-socket";
import {
  filterAndSortServices,
  serviceStatusCounts,
} from "@/features/infrastructure/components/services-view-model";
import {
  closeTerminalSession,
  createTerminalSession,
  getInfrastructureOverview,
  getServiceLogsSnapshot,
  runServiceAction,
} from "@/features/infrastructure/api/infrastructure.api";
import { infrastructureKeys } from "@/features/infrastructure/api/infrastructure.keys";
import {
  infrastructureOverviewQueryOptions,
  serviceLogsQueryOptions,
} from "@/features/infrastructure/api/infrastructure.queries";
import { HttpError } from "@/shared/api/http";

const service = {
  name: "spring-app",
  containerName: "spring-app",
  status: "running",
  health: "healthy",
  uptime: "1m",
  cpuPercent: 5,
  memoryBytes: 1024,
  memoryLimitBytes: 2048,
  diskReadBytes: 1024,
  diskWriteBytes: 2048,
  networkRxBytes: 4096,
  networkTxBytes: 8192,
  ports: [],
  terminalEnabled: true,
} satisfies InfrastructureOverviewDto["services"][number];

const overview: InfrastructureOverviewDto = {
  aggregate: {
    cpu: { percent: 10, supported: true },
    ram: { percent: 20, supported: true },
    diskRead: { bytes: 1024, supported: true },
    diskWrite: { bytes: 2048, supported: true },
    networkRx: { bytes: 4096, supported: true },
    networkTx: { bytes: 8192, supported: true },
  },
  services: [service],
  history: {
    sampleIntervalSeconds: 5,
    retentionMinutes: 60,
    points: [
      {
        timestamp: "2026-05-07T00:00:00Z",
        cpuPercent: 10,
        ramPercent: 20,
        diskReadBytes: 1024,
        diskWriteBytes: 2048,
        networkRxBytes: 4096,
        networkTxBytes: 8192,
        services: [{ ...service, ramPercent: 50 }],
      },
    ],
  },
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

describe("infra helpers", () => {
  it.each(["STOP", "RESTART"] as const)(
    "requires confirmation for %s and respects cancellation",
    (action) => {
      const confirm = vi.fn().mockReturnValue(false);
      vi.stubGlobal("window", { confirm });
      expect(confirmServiceAction("frontend", action)).toBe(false);
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining("frontend"));
      confirm.mockReturnValue(true);
      expect(confirmServiceAction("frontend", action)).toBe(true);
      confirm.mockClear();
      expect(confirmServiceAction("frontend", "START")).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    },
  );
  it("keeps health categories exclusive and never claims unknown services healthy", () => {
    const services = [
      overview.services[0],
      ...[null, "unknown", "unhealthy", "starting"].map((health) => ({
        ...overview.services[0],
        health,
      })),
      { ...overview.services[0], status: "exited", health: null },
    ];
    expect(services.map(serviceHealthCategory)).toEqual([
      "healthy",
      "unknown",
      "unknown",
      "degraded",
      "degraded",
      "down",
    ]);
    expect(countHealthyServices(services)).toBe(1);
    expect(countProblemServices(services)).toBe(5);
    expect(
      buildDashboardAlerts({ ...overview, services }, true, null).some(
        (alert) => alert.id === "healthy",
      ),
    ).toBe(false);
    expect(buildDashboardAlerts({ ...overview, services: [] }, true, null)).toEqual([]);
    expect(buildDashboardAlerts(overview, true, null)[0].id).toBe("healthy");
  });

  it("filters, sorts, and counts service rows", () => {
    const stopped = {
      ...overview.services[0],
      name: "worker",
      containerName: null,
      status: "exited" as const,
      health: null,
      cpuPercent: null,
    };
    const services = [stopped, overview.services[0]];

    expect(
      filterAndSortServices(services, {
        query: "spring",
        status: "running",
        health: "healthy",
        sort: { key: "cpuPercent", dir: "desc" },
      }),
    ).toEqual([overview.services[0]]);
    expect(
      filterAndSortServices(services, {
        query: "",
        status: "all",
        health: "all",
        sort: { key: "cpuPercent", dir: "asc" },
      }),
    ).toEqual([overview.services[0], stopped]);
    expect(serviceStatusCounts(services)).toEqual({
      all: 2,
      running: 1,
      stopped: 1,
      restarting: 0,
    });
  });

  it("applies overview delta without losing bounded history", () => {
    const next = applyInfrastructureEvent(overview, {
      type: "overview.delta",
      payload: {
        aggregate: {
          timestamp: "2026-05-07T00:00:05Z",
          cpuPercent: 11,
          ramPercent: 22,
          diskReadBytes: 2048,
          diskWriteBytes: 4096,
          networkRxBytes: 8192,
          networkTxBytes: 16384,
          services: [
            {
              name: "spring-app",
              cpuPercent: 6,
              ramPercent: 55,
              diskReadBytes: 2048,
              diskWriteBytes: 4096,
              networkRxBytes: 8192,
              networkTxBytes: 16384,
            },
          ],
        },
        services: overview.services,
      },
    });

    expect(next?.history.points).toHaveLength(2);
    expect(next?.aggregate.ram.percent).toBe(22);
    expect(next?.aggregate.networkTx.bytes).toBe(16384);
    expect(next?.history.points.at(-1)?.cpuPercent).toBe(11);
    expect(next?.history.points.at(-1)?.services[0]?.cpuPercent).toBe(6);
  });

  it("appends only selected service log lines", () => {
    const current = ["line-a"];
    const keep = appendLogLine(
      current,
      {
        type: "service.log.line",
        serviceName: "py-analyzer",
        line: "skip",
      },
      "spring-app",
    );
    const next = appendLogLine(
      current,
      {
        type: "service.log.line",
        serviceName: "spring-app",
        line: "keep",
      },
      "spring-app",
    );

    expect(keep).toEqual(current);
    expect(next.at(-1)).toBe("keep");
  });

  it("keeps valid selected service and falls back when missing", () => {
    expect(resolveSelectedService("spring-app", overview)).toBe("spring-app");
    expect(resolveSelectedService("frontend", overview)).toBe("spring-app");
  });

  it("builds websocket url from backend origin", () => {
    expect(buildWebSocketUrl("/api/admin/infrastructure/stream")).toMatch(/^wss?:\/\//);
  });

  it("computes dashboard summary facts from real overview data", () => {
    expect(countHealthyServices(overview.services)).toBe(1);
    expect(countProblemServices(overview.services)).toBe(0);
    expect(getOverviewTimestamp(overview)).toBe("2026-05-07T00:00:00Z");
  });

  it("builds alert rail items from transport and service issues", () => {
    const alerts = buildDashboardAlerts(
      {
        ...overview,
        services: [
          ...overview.services,
          {
            ...overview.services[0],
            name: "frontend",
            status: "missing",
            health: null,
            terminalEnabled: false,
          },
        ],
      },
      false,
      "frontend",
    );

    expect(alerts.some((alert) => alert.id === "stream")).toBe(true);
    expect(alerts.some((alert) => alert.id === "frontend")).toBe(true);
    expect(alerts.some((alert) => alert.id === "shell")).toBe(true);
  });

  it("preserves infrastructure query and transport contracts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(overview))
      .mockResolvedValueOnce(jsonResponse({ serviceName: "spring-app", lines: ["ready"] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ sessionId: "term-1", wsPath: "/terminal/term-1" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await getInfrastructureOverview();
    await getServiceLogsSnapshot("spring-app", 50);
    await runServiceAction("spring-app", "RESTART");
    await createTerminalSession("spring-app", 120, 40);
    await closeTerminalSession("term-1");

    expect(infrastructureOverviewQueryOptions().queryKey).toEqual(infrastructureKeys.all);
    expect(serviceLogsQueryOptions("spring-app").queryKey).toEqual(
      infrastructureKeys.logs("spring-app"),
    );
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost/api/admin/infrastructure/overview",
      "http://localhost/api/admin/infrastructure/services/spring-app/logs?tail=50",
      "http://localhost/api/admin/infrastructure/services/spring-app/actions",
      "http://localhost/api/admin/infrastructure/terminal/sessions",
      "http://localhost/api/admin/infrastructure/terminal/sessions/term-1",
    ]);
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "RESTART" }) }),
    );
  });

  it("preserves HTTP, network, and cancellation failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Denied", status: 403 }, 403)),
    );
    const httpFailure = getInfrastructureOverview();
    await expect(httpFailure).rejects.toBeInstanceOf(HttpError);
    await expect(httpFailure).rejects.toMatchObject({ status: 403 });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(getInfrastructureOverview()).rejects.toMatchObject({ status: 0 });

    const cancellation = new DOMException("cancelled", "AbortError");
    const controller = new AbortController();
    controller.abort(cancellation);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cancellation));
    await expect(getInfrastructureOverview(controller.signal)).rejects.toBe(cancellation);
  });
});
