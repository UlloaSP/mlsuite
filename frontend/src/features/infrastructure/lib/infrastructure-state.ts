import {
  isOverviewDeltaEvent,
  isOverviewSnapshotEvent,
} from "@/features/infrastructure/api/infrastructure.types";
import type {
  InfrastructureEvent,
  InfrastructureOverviewDto,
  ServiceLogEvent,
} from "@/features/infrastructure/api/infrastructure.types";

export function applyInfrastructureEvent(
  current: InfrastructureOverviewDto | undefined,
  event: InfrastructureEvent,
): InfrastructureOverviewDto | undefined {
  if (isOverviewSnapshotEvent(event)) {
    return event.payload;
  }
  if (!isOverviewDeltaEvent(event) || !current) {
    return current;
  }
  const nextPoint = {
    timestamp: event.payload.aggregate.timestamp,
    cpuPercent: event.payload.aggregate.cpuPercent,
    ramPercent: event.payload.aggregate.ramPercent,
    diskReadBytes: event.payload.aggregate.diskReadBytes,
    diskWriteBytes: event.payload.aggregate.diskWriteBytes,
    networkRxBytes: event.payload.aggregate.networkRxBytes,
    networkTxBytes: event.payload.aggregate.networkTxBytes,
    services: event.payload.aggregate.services,
  };
  const maxPoints = (current.history.retentionMinutes * 60) / current.history.sampleIntervalSeconds;
  return {
    aggregate: {
      cpu: { percent: event.payload.aggregate.cpuPercent },
      ram: { percent: event.payload.aggregate.ramPercent },
      diskRead: { bytes: event.payload.aggregate.diskReadBytes },
      diskWrite: { bytes: event.payload.aggregate.diskWriteBytes },
      networkRx: { bytes: event.payload.aggregate.networkRxBytes },
      networkTx: { bytes: event.payload.aggregate.networkTxBytes },
    },
    services: event.payload.services,
    history: {
      ...current.history,
      points: [...current.history.points, nextPoint].slice(-maxPoints),
    },
  };
}

export function appendLogLine(
  lines: string[],
  event: ServiceLogEvent,
  selectedService: string | null,
) {
  if (event.serviceName !== selectedService) {
    return lines;
  }
  return [...lines, event.line].slice(-500);
}

export function resolveSelectedService(
  selectedService: string | null,
  overview: InfrastructureOverviewDto,
) {
  if (selectedService && overview.services.some((service) => service.name === selectedService)) {
    return selectedService;
  }
  return overview.services[0]?.name ?? null;
}

/** Stopping or restarting interrupts a service, so it asks first; starting does not. */
export function serviceActionConfirmation(
  serviceName: string,
  action: "START" | "STOP" | "RESTART",
) {
  if (action === "START") return null;
  const verb = action === "STOP" ? "Stop" : "Restart";
  return {
    title: `${verb} ${serviceName}?`,
    description: "This interrupts the service and may disconnect users, including this dashboard.",
    confirmLabel: verb,
    danger: action === "STOP",
  };
}
