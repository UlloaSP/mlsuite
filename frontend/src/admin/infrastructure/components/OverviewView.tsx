import { useState } from "react";
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	LineChart as RechartsLineChart,
	Line as RechartsLine,
} from "recharts";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronRight,
	Download,
	ExternalLink,
	RefreshCw,
} from "lucide-react";
import { AppBadge, AppButton, cx } from "../../../app/components";
import {
	buildDashboardAlerts,
	countHealthyServices,
	countProblemServices,
	toneForMetric,
} from "../dashboardSummary";
import { formatBytes, formatPercent, formatTimestamp } from "../formatters";
import type { InfrastructureOverviewDto } from "../types";

type Props = {
	overview: InfrastructureOverviewDto;
	streamConnected: boolean;
	onNavigateTab: (tab: "overview" | "services" | "logs" | "terminal" | "alerts") => void;
};

type ChartLayer = "cpu" | "ram" | "disk" | "vram";

const LAYER_CONFIG: Record<ChartLayer, { label: string; color: string; area: boolean }> = {
	cpu: { label: "CPU", color: "#6366f1", area: false },
	ram: { label: "RAM", color: "#10b981", area: true },
	disk: { label: "Disk", color: "#64748b", area: true },
	vram: { label: "VRAM", color: "#f59e0b", area: true },
};

export function OverviewView({ overview, streamConnected, onNavigateTab }: Props) {
	const [chartRange, setChartRange] = useState("60m");
	const [layers, setLayers] = useState<Record<ChartLayer, boolean>>({
		cpu: true,
		ram: true,
		disk: false,
		vram: false,
	});

	const host = overview.host;
	const points = overview.history.points;
	const alerts = buildDashboardAlerts(overview, streamConnected, null);
	const running = countHealthyServices(overview.services);
	const issues = countProblemServices(overview.services);
	const totalMem = overview.services.reduce((sum, s) => sum + (s.memoryBytes ?? 0), 0);

	const toggleLayer = (key: ChartLayer) =>
		setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

	const curValue = (key: "cpuPercent" | "ramPercent" | "diskPercent" | "vramPercent") =>
		points.length > 0 ? points[points.length - 1][key] : null;

	return (
		<div className="space-y-5">
			{/* Page header */}
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
						Infrastructure overview
					</p>
					<h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
						Control dashboard
					</h1>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">
						Host telemetry, managed services, and operational signals across the cluster.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<SegmentedControl
						options={["15m", "60m", "6h", "24h"]}
						value={chartRange}
						onChange={setChartRange}
					/>
					<AppButton variant="secondary" className="gap-2 px-3 py-2 text-xs">
						<RefreshCw size={13} /> Refresh
					</AppButton>
					<AppButton className="gap-2 px-3 py-2 text-xs">
						<Download size={13} /> Export
					</AppButton>
				</div>
			</div>

			{/* KPI row */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<KpiCard
					label="CPU"
					value={formatPercent(host.cpu.percent)}
					sub="host processor load"
					tone={toneForMetric(host.cpu.percent)}
					data={points.map((p) => ({ v: p.cpuPercent }))}
					color="#6366f1"
				/>
				<KpiCard
					label="RAM"
					value={formatPercent(host.ram.percent)}
					sub="memory utilization"
					tone={toneForMetric(host.ram.percent)}
					data={points.map((p) => ({ v: p.ramPercent }))}
					color="#10b981"
				/>
				<KpiCard
					label="Disk"
					value={formatPercent(host.disk.percent)}
					sub="storage usage"
					tone={toneForMetric(host.disk.percent)}
					data={points.map((p) => ({ v: p.diskPercent }))}
					color="#64748b"
				/>
				<KpiCard
					label="VRAM"
					value={host.vram.supported ? formatPercent(host.vram.percent) : "offline"}
					sub={host.vram.supported ? "gpu memory" : "gpu-runner stopped"}
					tone={host.vram.supported ? toneForMetric(host.vram.percent) : "neutral"}
					data={points.map((p) => ({ v: p.vramPercent ?? 0 }))}
					color="#f59e0b"
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

			{/* Chart + alerts row */}
			<div className="grid gap-4 xl:grid-cols-[1fr_320px]">
				{/* Chart panel */}
				<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-3.5">
						<div>
							<p className="text-sm font-semibold text-[var(--text-primary)]">
								Host load &middot; last {chartRange}
							</p>
							<p className="mt-0.5 text-xs text-[var(--text-secondary)]">
								Toggle layers to compare host telemetry over time.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<AppBadge tone={streamConnected ? "success" : "warning"} className="px-2 py-0.5 text-[0.6rem]">
								{streamConnected ? "live" : "snapshot"}
							</AppBadge>
							<AppBadge className="px-2 py-0.5 text-[0.6rem]">
								{overview.history.sampleIntervalSeconds}s sample
							</AppBadge>
						</div>
					</div>
					<div className="flex flex-wrap gap-4 border-b border-[var(--border-soft)] px-5 py-2.5">
						{(Object.entries(LAYER_CONFIG) as [ChartLayer, typeof LAYER_CONFIG.cpu][]).map(
							([key, cfg]) => (
								<label
									key={key}
									className="flex cursor-pointer select-none items-center gap-2 text-xs text-[var(--text-secondary)]"
								>
									<input
										type="checkbox"
										checked={layers[key]}
										onChange={() => toggleLayer(key)}
										className="accent-[var(--accent-primary)]"
									/>
									<span
										className="inline-block size-2.5 rounded-sm"
										style={{ background: cfg.color }}
									/>
									{cfg.label}
									<span className="font-mono text-[var(--text-muted)]">
										{formatPercent(curValue(`${key}Percent` as "cpuPercent" | "ramPercent" | "diskPercent" | "vramPercent"))}
									</span>
								</label>
							),
						)}
					</div>
					<div className="px-3 pb-3 pt-2">
						<div className="h-[240px]">
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart
									data={points}
									margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
								>
									<CartesianGrid
										stroke="var(--border-soft)"
										strokeDasharray="2 4"
										vertical={false}
									/>
									<XAxis
										dataKey="timestamp"
										tickFormatter={formatTimestamp}
										minTickGap={50}
										tick={{ fill: "var(--text-muted)", fontSize: 10 }}
										stroke="var(--border-soft)"
									/>
									<YAxis
										domain={[0, 100]}
										tickFormatter={(v: number) => `${v}%`}
										tick={{ fill: "var(--text-muted)", fontSize: 10 }}
										stroke="var(--border-soft)"
										width={36}
									/>
									<Tooltip content={<ChartTooltip />} />
									{layers.ram && (
										<Area
											type="monotone"
											dataKey="ramPercent"
											name="RAM"
											stroke={LAYER_CONFIG.ram.color}
											fill={LAYER_CONFIG.ram.color}
											fillOpacity={0.08}
										/>
									)}
									{layers.disk && (
										<Area
											type="monotone"
											dataKey="diskPercent"
											name="Disk"
											stroke={LAYER_CONFIG.disk.color}
											fill={LAYER_CONFIG.disk.color}
											fillOpacity={0.06}
										/>
									)}
									{layers.vram && overview.history.supported && (
										<Area
											type="monotone"
											dataKey="vramPercent"
											name="VRAM"
											stroke={LAYER_CONFIG.vram.color}
											fill={LAYER_CONFIG.vram.color}
											fillOpacity={0.06}
										/>
									)}
									{layers.cpu && (
										<Line
											type="monotone"
											dataKey="cpuPercent"
											name="CPU"
											stroke={LAYER_CONFIG.cpu.color}
											strokeWidth={2}
											dot={false}
										/>
									)}
								</ComposedChart>
							</ResponsiveContainer>
						</div>
					</div>
					<div className="flex items-center justify-between border-t border-[var(--border-soft)] px-5 py-2.5 text-xs text-[var(--text-secondary)]">
						<span>
							{Object.values(layers).filter(Boolean).length} layers &middot;{" "}
							{points.length} samples
						</span>
						<div className="flex items-center gap-3">
							<button className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
								<Download size={12} /> CSV
							</button>
							<button className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
								<ExternalLink size={12} /> Grafana
							</button>
						</div>
					</div>
				</div>

				{/* Alerts panel */}
				<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
					<div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
						<div>
							<p className="text-sm font-semibold text-[var(--text-primary)]">
								Operational signals
							</p>
							<p className="mt-0.5 text-xs text-[var(--text-secondary)]">
								{alerts.length} active in last 60m
							</p>
						</div>
						<button
							className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							onClick={() => onNavigateTab("alerts")}
						>
							View all
						</button>
					</div>
					<div className="divide-y divide-[var(--border-soft)]">
						{alerts.slice(0, 4).map((alert) => (
							<div key={alert.id} className="flex gap-3 px-4 py-3">
								<div
									className={cx(
										"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
										alert.tone === "danger" && "bg-[var(--danger-quiet)] text-[var(--danger-text)]",
										alert.tone === "warning" && "bg-[var(--warning-quiet)] text-[var(--warning-text)]",
										alert.tone === "accent" && "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]",
										alert.tone === "success" && "bg-[var(--success-quiet)] text-[var(--success-text)]",
									)}
								>
									{alert.tone === "success" ? (
										<CheckCircle2 size={14} />
									) : (
										<AlertTriangle size={14} />
									)}
								</div>
								<div className="min-w-0">
									<p className="text-xs font-medium text-[var(--text-primary)]">
										{alert.title}
									</p>
									<p className="mt-0.5 text-[0.68rem] text-[var(--text-secondary)]">
										{alert.detail}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Bottom row: services glance + memory */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Services at a glance */}
				<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
					<div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
						<div>
							<p className="text-sm font-semibold text-[var(--text-primary)]">
								Services at a glance
							</p>
							<p className="mt-0.5 text-xs text-[var(--text-secondary)]">
								{running} running &middot; {issues} need attention
							</p>
						</div>
						<button
							className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							onClick={() => onNavigateTab("services")}
						>
							Manage <ChevronRight size={12} />
						</button>
					</div>
					<div className="px-5 py-4">
						{/* Health bar */}
						<div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
							{overview.services.map((s) => (
								<div
									key={s.name}
									className="flex-1"
									style={{
										background:
											s.status === "running" && (s.health == null || s.health === "healthy")
												? "var(--success-text)"
												: s.status === "running"
													? "#d97706"
													: "var(--danger-text)",
									}}
									title={`${s.name} - ${s.status}/${s.health ?? "unknown"}`}
								/>
							))}
						</div>
						{/* Counts */}
						<div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--border-soft)]">
							<CountCell
								label="Healthy"
								value={countHealthyServices(overview.services)}
								color="var(--success-text)"
							/>
							<CountCell
								label="Degraded"
								value={
									overview.services.filter(
										(s) => s.status === "running" && s.health != null && s.health !== "healthy",
									).length
								}
								color="#d97706"
							/>
							<CountCell
								label="Unknown"
								value={overview.services.filter((s) => s.health == null).length}
								color="var(--text-muted)"
							/>
							<CountCell
								label="Down"
								value={overview.services.filter((s) => s.status !== "running").length}
								color="var(--danger-text)"
							/>
						</div>
					</div>
				</div>

				{/* Memory usage */}
				<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
					<div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
						<div>
							<p className="text-sm font-semibold text-[var(--text-primary)]">
								Memory usage by service
							</p>
							<p className="mt-0.5 text-xs text-[var(--text-secondary)]">
								{formatBytes(totalMem)} allocated
							</p>
						</div>
					</div>
					<div className="px-5 py-3">
						{overview.services
							.filter((s) => s.memoryBytes != null && s.memoryBytes > 0)
							.sort((a, b) => (b.memoryBytes ?? 0) - (a.memoryBytes ?? 0))
							.slice(0, 6)
							.map((s) => (
								<MemoryBar key={s.name} service={s} />
							))}
					</div>
				</div>
			</div>
		</div>
	);
}

function KpiCard({
	label,
	value,
	sub,
	tone: _tone,
	data,
	color,
}: {
	label: string;
	value: string;
	sub: string;
	tone: "danger" | "warning" | "success" | "neutral";
	data: Array<{ v: number }>;
	color: string;
}) {
	return (
		<div className="relative overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 pb-3 pt-3.5">
			<p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
				{label}
			</p>
			<p className="mt-1.5 font-mono text-xl font-medium tracking-tight text-[var(--text-primary)]">
				{value}
			</p>
			<p className="mt-1 text-[0.68rem] text-[var(--text-secondary)]">{sub}</p>
			{data.length > 0 && (
				<div className="absolute bottom-3 right-3 h-7 w-20 opacity-90">
					<ResponsiveContainer width="100%" height="100%">
						<RechartsLineChart data={data}>
							<RechartsLine
								dataKey="v"
								type="monotone"
								dot={false}
								stroke={color}
								strokeWidth={1.5}
							/>
						</RechartsLineChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);
}

function CountCell({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div className="bg-[var(--surface-primary)] px-3.5 py-2.5">
			<p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
				{label}
			</p>
			<p className="mt-1 font-mono text-base font-medium" style={{ color }}>
				{value}
			</p>
		</div>
	);
}

function MemoryBar({ service }: { service: { name: string; memoryBytes: number | null } }) {
	const bytes = service.memoryBytes ?? 0;
	const maxBytes = 512 * 1024 * 1024;
	const pct = Math.min(100, (bytes / maxBytes) * 100);
	return (
		<div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 py-1.5">
			<p className="truncate text-xs text-[var(--text-primary)]">{service.name}</p>
			<div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
				<div
					className="h-full rounded-full bg-[var(--accent-primary)]"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<p className="text-right font-mono text-[0.68rem] text-[var(--text-secondary)]">
				{formatBytes(bytes)}
			</p>
		</div>
	);
}

function SegmentedControl({
	options,
	value,
	onChange,
}: {
	options: string[];
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="inline-flex gap-0.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] p-0.5">
			{options.map((opt) => (
				<button
					key={opt}
					className={cx(
						"rounded-md px-2.5 py-1 text-[0.68rem] font-medium transition",
						value === opt
							? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
							: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
					)}
					onClick={() => onChange(opt)}
				>
					{opt}
				</button>
			))}
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
			<p className="mb-1.5 font-mono text-[0.6rem] text-[var(--text-muted)]">
				{formatTimestamp(String(label ?? ""))}
			</p>
			{payload.map((entry, i) => (
				<div
					key={`${entry.name}-${i}`}
					className="flex items-center justify-between gap-4"
				>
					<span className="flex items-center gap-1.5">
						<span
							className="inline-block size-2 rounded-sm"
							style={{ background: entry.color }}
						/>
						{entry.name}
					</span>
					<span className="font-mono">
						{formatPercent(typeof entry.value === "number" ? entry.value : null)}
					</span>
				</div>
			))}
		</div>
	);
}
