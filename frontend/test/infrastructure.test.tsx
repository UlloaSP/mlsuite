import { describe, expect, it } from "vite-plus/test";
import {
  buildDashboardAlerts,
  countHealthyServices,
  countProblemServices,
  getOverviewTimestamp,
} from "../src/admin/infrastructure/dashboardSummary";
import {
  appendLogLine,
  applyInfrastructureEvent,
  resolveSelectedService,
} from "../src/admin/infrastructure/state";
import type { InfrastructureOverviewDto } from "../src/admin/infrastructure/types";
import { buildWebSocketUrl } from "../src/admin/infrastructure/ws/infrastructureSocket";

const overview: InfrastructureOverviewDto = {
  aggregate: {
    cpu: { percent: 10, supported: true },
    ram: { percent: 20, supported: true },
    diskRead: { bytes: 1024, supported: true },
    diskWrite: { bytes: 2048, supported: true },
    networkRx: { bytes: 4096, supported: true },
    networkTx: { bytes: 8192, supported: true },
  },
  services: [
    {
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
    },
  ],
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
        services: [
          {
            name: "spring-app",
            cpuPercent: 5,
            ramPercent: 50,
            diskReadBytes: 1024,
            diskWriteBytes: 2048,
            networkRxBytes: 4096,
            networkTxBytes: 8192,
          },
        ],
      },
    ],
  },
};

describe("infra helpers", () => {
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
            name: "frontend",
            containerName: null,
            status: "missing",
            health: null,
            uptime: null,
            cpuPercent: null,
            memoryBytes: null,
            memoryLimitBytes: null,
            diskReadBytes: null,
            diskWriteBytes: null,
            networkRxBytes: null,
            networkTxBytes: null,
            ports: [],
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
});
