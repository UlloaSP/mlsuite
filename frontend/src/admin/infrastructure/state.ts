import {
	isOverviewDeltaEvent,
	isOverviewSnapshotEvent,
} from "./types";
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
		timestamp: event.payload.host.timestamp,
		cpuPercent: event.payload.host.cpuPercent,
		ramPercent: event.payload.host.ramPercent,
		diskPercent: event.payload.host.diskPercent,
		vramPercent: event.payload.host.vramPercent,
	};
	const maxPoints =
		(current.history.retentionMinutes * 60) / current.history.sampleIntervalSeconds;
	return {
		host: {
			cpu: { percent: event.payload.host.cpuPercent, supported: true },
			ram: { percent: event.payload.host.ramPercent, supported: true },
			disk: { percent: event.payload.host.diskPercent, supported: true },
			vram: {
				percent: event.payload.host.vramPercent,
				supported: event.payload.host.vramSupported,
			},
		},
		services: event.payload.services,
		history: {
			...current.history,
			supported: event.payload.host.vramSupported,
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
