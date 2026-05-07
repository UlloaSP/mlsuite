import { AlertTriangle, HardDrive, MemoryStick, MonitorCog, Server } from "lucide-react";
import type { ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { AppBadge, AppPanel, cx } from "../../../app/components";
import {
	countHealthyServices,
	countProblemServices,
	toneForMetric,
} from "../dashboardSummary";
import { formatPercent } from "../formatters";
import type { InfrastructureOverviewDto } from "../types";

type Props = {
	overview: InfrastructureOverviewDto;
};

export function InfrastructureSummaryGrid({ overview }: Props) {
	const points = overview.history.points;
	const vramHistory = points.map((point) => ({
		timestamp: point.timestamp,
		value: point.vramPercent ?? 0,
	}));
	return (
		<div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-6">
			<MetricCard
				label="cpu"
				value={formatPercent(overview.host.cpu.percent)}
				icon={<MonitorCog size={16} />}
				tone={toneForMetric(overview.host.cpu.percent)}
				data={points.map((point) => ({ timestamp: point.timestamp, value: point.cpuPercent }))}
			/>
			<MetricCard
				label="ram"
				value={formatPercent(overview.host.ram.percent)}
				icon={<MemoryStick size={16} />}
				tone={toneForMetric(overview.host.ram.percent)}
				data={points.map((point) => ({ timestamp: point.timestamp, value: point.ramPercent }))}
			/>
			<MetricCard
				label="disk"
				value={formatPercent(overview.host.disk.percent)}
				icon={<HardDrive size={16} />}
				tone={toneForMetric(overview.host.disk.percent)}
				data={points.map((point) => ({ timestamp: point.timestamp, value: point.diskPercent }))}
			/>
			<MetricCard
				label="vram"
				value={overview.host.vram.supported ? formatPercent(overview.host.vram.percent) : "offline"}
				icon={<MonitorCog size={16} />}
				tone={overview.host.vram.supported ? toneForMetric(overview.host.vram.percent) : "neutral"}
				data={vramHistory}
			/>
			<StatCard
				label="services healthy"
				value={`${countHealthyServices(overview.services)}/${overview.services.length}`}
				detail="managed services up"
				icon={<Server size={16} />}
				tone={countProblemServices(overview.services) ? "warning" : "success"}
			/>
			<StatCard
				label="active alerts"
				value={`${countProblemServices(overview.services)}`}
				detail="service issues now"
				icon={<AlertTriangle size={16} />}
				tone={countProblemServices(overview.services) ? "danger" : "success"}
			/>
		</div>
	);
}

function MetricCard({
	label,
	value,
	icon,
	tone,
	data,
}: {
	label: string;
	value: string;
	icon: ReactNode;
	tone: "danger" | "warning" | "success" | "neutral";
	data: Array<{ timestamp: string; value: number }>;
}) {
	return (
		<AppPanel className="overflow-hidden rounded-[28px] border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(252,248,246,0.92))] p-0">
			<div className="flex items-start justify-between px-5 pb-3 pt-5">
				<div>
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						{label}
					</p>
					<p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{value}</p>
				</div>
				<AppBadge tone={tone} className="gap-2">
					{icon}
					live
				</AppBadge>
			</div>
			<div className="h-16 border-t border-[var(--border-soft)]/80 bg-[linear-gradient(180deg,_transparent,_rgba(255,56,92,0.03))] px-3 pb-2 pt-1">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={data}>
						<Line
							dataKey="value"
							type="monotone"
							dot={false}
							stroke={strokeForTone(tone)}
							strokeWidth={2.5}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</AppPanel>
	);
}

function StatCard({
	label,
	value,
	detail,
	icon,
	tone,
}: {
	label: string;
	value: string;
	detail: string;
	icon: ReactNode;
	tone: "danger" | "warning" | "success" | "neutral";
}) {
	return (
		<AppPanel className="rounded-[28px] border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,249,252,0.92))]">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						{label}
					</p>
					<p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{value}</p>
					<p className="mt-2 text-sm text-[var(--text-secondary)]">{detail}</p>
				</div>
				<div className={cx("rounded-full p-3", iconShellForTone(tone))}>{icon}</div>
			</div>
		</AppPanel>
	);
}

function strokeForTone(tone: "danger" | "warning" | "success" | "neutral") {
	if (tone === "danger") {
		return "#c13515";
	}
	if (tone === "warning") {
		return "#b7791f";
	}
	if (tone === "success") {
		return "#0f8f5c";
	}
	return "#6a6a6a";
}

function iconShellForTone(tone: "danger" | "warning" | "success" | "neutral") {
	if (tone === "danger") {
		return "bg-[var(--danger-quiet)] text-[var(--danger-text)]";
	}
	if (tone === "warning") {
		return "bg-[var(--warning-quiet)] text-[var(--warning-text)]";
	}
	if (tone === "success") {
		return "bg-[var(--success-quiet)] text-[var(--success-text)]";
	}
	return "bg-[var(--surface-muted)] text-[var(--text-secondary)]";
}
