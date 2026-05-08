import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, ChevronRight, Download, RefreshCw } from "lucide-react";
import { AppBadge, AppButton, cx } from "../../../app/components";
import {
	buildDashboardAlerts,
	countHealthyServices,
	countProblemServices,
	toneForMetric,
} from "../dashboardSummary";
import { formatBytes, formatPercent, formatTimestamp } from "../formatters";
import type { InfrastructureOverviewDto } from "../types";
import type { ChartLayer, ChartValueKey } from "./OverviewMetrics";
import { LAYER_CONFIG, chartPointForService, formatChartValue, yAxisMode } from "./OverviewMetrics";
import { CountCell, KpiCard, MemoryBar, SegmentedControl, ServiceHealthSegment, alertTone } from "./OverviewViewSupport";

type Props = {
	overview: InfrastructureOverviewDto;
	streamConnected: boolean;
	onNavigateTab: (tab: "overview" | "services" | "logs" | "terminal" | "alerts") => void;
};

export function OverviewView({ overview, streamConnected, onNavigateTab }: Props) {
	const [chartRange, setChartRange] = useState("60m");
	const [chartService, setChartService] = useState("all");
	const [layers, setLayers] = useState<Record<ChartLayer, boolean>>({
		cpu: true,
		ram: true,
		diskRead: false,
		diskWrite: false,
		networkRx: false,
		networkTx: false,
	});
	const aggregate = overview.aggregate;
	const points = overview.history.points;
	const chartPoints = points.map((point) => {
		if (chartService === "all") return point;
		return chartPointForService(point, chartService);
	});
	const alerts = buildDashboardAlerts(overview, streamConnected, null);
	const running = countHealthyServices(overview.services);
	const issues = countProblemServices(overview.services);
	const totalMem = overview.services.reduce((sum, s) => sum + (s.memoryBytes ?? 0), 0);
	const toggleLayer = (key: ChartLayer) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
	const axisMode = yAxisMode(layers);
	const curValue = (key: ChartValueKey) => chartPoints.length > 0 ? chartPoints[chartPoints.length - 1][key] : null;

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
						Infrastructure overview
					</p>
					<h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Control dashboard</h1>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">Managed services, live logs, shell access, and aggregate resource use.</p>
				</div>
				<div className="flex items-center gap-2">
					<SegmentedControl options={["15m", "60m", "6h", "24h"]} value={chartRange} onChange={setChartRange} />
					<AppButton variant="secondary" className="gap-2 px-3 py-2 text-xs">
						<RefreshCw size={13} /> Refresh
					</AppButton>
					<AppButton className="gap-2 px-3 py-2 text-xs">
						<Download size={13} /> Export
					</AppButton>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<KpiCard
					label="CPU"
					value={formatPercent(aggregate.cpu.percent)}
					sub="summed service CPU"
					tone={toneForMetric(aggregate.cpu.percent)}
					data={points.map((p) => ({ v: p.cpuPercent }))}
					color="#6366f1"
				/>
				<KpiCard
					label="RAM"
					value={formatPercent(aggregate.ram.percent)}
					sub="service memory share"
					tone={toneForMetric(aggregate.ram.percent)}
					data={points.map((p) => ({ v: p.ramPercent }))}
					color="#10b981"
				/>
				<KpiCard
					label="Disk R/W"
					value={`${formatBytes(aggregate.diskRead.bytes)} / ${formatBytes(aggregate.diskWrite.bytes)}`}
					sub="Docker BlockIO"
					tone="neutral"
					data={points.map((p) => ({ v: p.diskReadBytes }))}
					color="#f59e0b"
				/>
				<KpiCard
					label="Network I/O"
					value={`${formatBytes(aggregate.networkRx.bytes)} / ${formatBytes(aggregate.networkTx.bytes)}`}
					sub="Docker NetIO"
					tone="neutral"
					data={points.map((p) => ({ v: p.networkRxBytes }))}
					color="#0ea5e9"
				/>
				<KpiCard
					label="Services"
					value={`${running}/${overview.services.length}`}
					sub={issues > 0 ? `${issues} need attention` : "all healthy"}
					tone={issues > 0 ? "warning" : "success"}
					data={[]}
					color="#10b981"
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-[1fr_320px]">
				<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-3.5">
						<div>
							<p className="text-sm font-semibold text-[var(--text-primary)]">
								Service aggregate load &middot; last {chartRange}
							</p>
							<p className="mt-0.5 text-xs text-[var(--text-secondary)]">Toggle layers to compare Docker CPU, memory, disk, and network metrics.</p>
						</div>
						<div className="flex items-center gap-2">
							<select
								className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-2 py-1 text-[0.68rem] text-[var(--text-primary)] outline-none"
								value={chartService}
								onChange={(event) => setChartService(event.target.value)}
							>
								<option value="all">All services</option>
								{overview.services.map((service) => (
									<option key={service.name} value={service.name}>{service.name}</option>
								))}
							</select>
							<AppBadge tone={streamConnected ? "success" : "warning"} className="px-2 py-0.5 text-[0.6rem]">
								{streamConnected ? "live" : "snapshot"}
							</AppBadge>
							<AppBadge className="px-2 py-0.5 text-[0.6rem]">{overview.history.sampleIntervalSeconds}s sample</AppBadge>
						</div>
					</div>
					<div className="flex flex-wrap gap-4 border-b border-[var(--border-soft)] px-5 py-2.5">
						{(Object.entries(LAYER_CONFIG) as [ChartLayer, typeof LAYER_CONFIG.cpu][]).map(([key, cfg]) => (
							<label key={key} className="flex cursor-pointer select-none items-center gap-2 text-xs text-[var(--text-secondary)]">
								<input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} className="accent-[var(--accent-primary)]" />
								<span className="inline-block size-2.5 rounded-sm" style={{ background: cfg.color }} />
								{cfg.label}
								<span className="font-mono text-[var(--text-muted)]">{formatChartValue(cfg.unit, curValue(cfg.dataKey) as number | null)}</span>
							</label>
						))}
					</div>
					<div className="px-3 pb-3 pt-2">
						<div className="h-[240px]">
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart data={chartPoints} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
									<CartesianGrid stroke="var(--border-soft)" strokeDasharray="2 4" vertical={false} />
									<XAxis dataKey="timestamp" tickFormatter={formatTimestamp} minTickGap={50} tick={{ fill: "var(--text-muted)", fontSize: 10 }} stroke="var(--border-soft)" />
									<YAxis domain={axisMode === "bytes" ? [0, "auto"] : [0, 100]} tickFormatter={(v: number) => formatChartValue(axisMode, v)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} stroke="var(--border-soft)" width={46} />
									<Tooltip content={<ChartTooltip />} />
									{(Object.entries(LAYER_CONFIG) as [ChartLayer, typeof LAYER_CONFIG.cpu][]).map(([key, cfg]) =>
										layers[key] && cfg.area
											? <Area key={key} type="monotone" dataKey={cfg.dataKey} name={cfg.label} stroke={cfg.color} fill={cfg.color} fillOpacity={0.08} />
											: layers[key] && <Line key={key} type="monotone" dataKey={cfg.dataKey} name={cfg.label} stroke={cfg.color} strokeWidth={2} dot={false} />
									)}
								</ComposedChart>
							</ResponsiveContainer>
						</div>
					</div>
					<div className="flex items-center justify-between border-t border-[var(--border-soft)] px-5 py-2.5 text-xs text-[var(--text-secondary)]">
						<span>{Object.values(layers).filter(Boolean).length} layers &middot; {points.length} samples</span>
						<button className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
							<Download size={12} /> CSV
						</button>
					</div>
				</div>

				<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
					<div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
						<div>
							<p className="text-sm font-semibold text-[var(--text-primary)]">Operational signals</p>
							<p className="mt-0.5 text-xs text-[var(--text-secondary)]">{alerts.length} active in last 60m</p>
						</div>
						<button className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => onNavigateTab("alerts")}>
							View all
						</button>
					</div>
					<div className="divide-y divide-[var(--border-soft)]">
						{alerts.slice(0, 4).map((alert) => (
							<div key={alert.id} className="flex gap-3 px-4 py-3">
								<div className={cx("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md", alertTone(alert.tone))}>
									{alert.tone === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
								</div>
								<div className="min-w-0">
									<p className="text-xs font-medium text-[var(--text-primary)]">{alert.title}</p>
									<p className="mt-0.5 text-[0.68rem] text-[var(--text-secondary)]">{alert.detail}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<ServiceGlance overview={overview} running={running} issues={issues} onNavigateTab={onNavigateTab} />
				<ServiceMemory services={overview.services} totalMem={totalMem} />
			</div>
		</div>
	);
}

function ServiceGlance({ overview, running, issues, onNavigateTab }: {
	overview: InfrastructureOverviewDto;
	running: number;
	issues: number;
	onNavigateTab: Props["onNavigateTab"];
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
			<div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
				<div>
					<p className="text-sm font-semibold text-[var(--text-primary)]">Services at a glance</p>
					<p className="mt-0.5 text-xs text-[var(--text-secondary)]">{running} running &middot; {issues} need attention</p>
				</div>
				<button className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => onNavigateTab("services")}>
					Manage <ChevronRight size={12} />
				</button>
			</div>
			<div className="px-5 py-4">
				<div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
					{overview.services.map((s) => <ServiceHealthSegment key={s.name} service={s} />)}
				</div>
				<div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--border-soft)]">
					<CountCell label="Healthy" value={countHealthyServices(overview.services)} color="var(--success-text)" />
					<CountCell label="Degraded" value={overview.services.filter((s) => s.status === "running" && s.health != null && s.health !== "healthy").length} color="#d97706" />
					<CountCell label="Unknown" value={overview.services.filter((s) => s.health == null).length} color="var(--text-muted)" />
					<CountCell label="Down" value={overview.services.filter((s) => s.status !== "running").length} color="var(--danger-text)" />
				</div>
			</div>
		</div>
	);
}

function ServiceMemory({ services, totalMem }: { services: InfrastructureOverviewDto["services"]; totalMem: number }) {
	return (
		<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
			<div className="border-b border-[var(--border-soft)] px-5 py-3.5">
				<p className="text-sm font-semibold text-[var(--text-primary)]">Memory usage by service</p>
				<p className="mt-0.5 text-xs text-[var(--text-secondary)]">{formatBytes(totalMem)} allocated</p>
			</div>
			<div className="px-5 py-3">
				{services.filter((s) => s.memoryBytes != null && s.memoryBytes > 0).sort((a, b) => (b.memoryBytes ?? 0) - (a.memoryBytes ?? 0)).slice(0, 6).map((s) => (
					<MemoryBar key={s.name} service={s} />
				))}
			</div>
		</div>
	);
}

function ChartTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: Array<{ name?: string; color?: string; value?: number | string }>;
	label?: string | number;
}) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-2 text-xs shadow-lg">
			<p className="mb-1.5 font-mono text-[0.6rem] text-[var(--text-muted)]">{formatTimestamp(String(label ?? ""))}</p>
			{payload.map((entry, i) => (
				<div key={`${entry.name}-${i}`} className="flex items-center justify-between gap-4">
					<span className="flex items-center gap-1.5">
						<span className="inline-block size-2 rounded-sm" style={{ background: entry.color }} />
						{entry.name}
					</span>
					<span className="font-mono">{formatChartValue(unitForPayload(entry.name), typeof entry.value === "number" ? entry.value : null)}</span>
				</div>
			))}
		</div>
	);
}

function unitForPayload(name?: string) {
	return Object.values(LAYER_CONFIG).find((cfg) => cfg.label === name)?.unit ?? "percent";
}
