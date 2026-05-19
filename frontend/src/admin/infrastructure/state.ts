import { isOverviewDeltaEvent, isOverviewSnapshotEvent } from "./types";
import type { InfrastructureEvent, InfrastructureOverviewDto, ServiceLogEvent } from "./types";

export function applyInfrastructureEvent(
  current: InfrastructureOverviewDto | null,
  event: InfrastructureEvent,
): InfrastructureOverviewDto | null {
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
      cpu: { percent: event.payload.aggregate.cpuPercent, supported: true },
      ram: { percent: event.payload.aggregate.ramPercent, supported: true },
      diskRead: { bytes: event.payload.aggregate.diskReadBytes, supported: true },
      diskWrite: { bytes: event.payload.aggregate.diskWriteBytes, supported: true },
      networkRx: { bytes: event.payload.aggregate.networkRxBytes, supported: true },
      networkTx: { bytes: event.payload.aggregate.networkTxBytes, supported: true },
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
