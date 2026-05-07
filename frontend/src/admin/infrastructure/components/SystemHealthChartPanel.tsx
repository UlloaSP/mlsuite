import {
	Area,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { AppBadge, AppPanel, AppSectionTitle, cx } from "../../../app/components";
import { formatPercent, formatTimestamp } from "../formatters";
import type { InfrastructureOverviewDto } from "../types";

type Props = {
	overview: InfrastructureOverviewDto;
	streamConnected: boolean;
};

type TooltipEntry = {
	name?: string;
	color?: string;
	value?: number | string;
};

export function SystemHealthChartPanel({ overview, streamConnected }: Props) {
	return (
		<AppPanel className="rounded-[30px] border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,247,250,0.94))] p-0">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 pb-5 pt-6">
				<div>
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						primary telemetry
					</p>
					<AppSectionTitle className="mt-2 text-[1.55rem]">Host load over last 60 minutes</AppSectionTitle>
					<p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
						CPU as line signal. RAM, disk, and VRAM as layered capacity traces.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<AppBadge tone={streamConnected ? "success" : "warning"}>
						{streamConnected ? "live stream" : "snapshot only"}
					</AppBadge>
					<AppBadge>{overview.history.sampleIntervalSeconds}s sample</AppBadge>
					<AppBadge>{overview.history.retentionMinutes}m window</AppBadge>
				</div>
			</div>
			<div className="px-4 pb-4 pt-3">
				<div className="h-[360px] rounded-[26px] border border-[#20161b] bg-[radial-gradient(circle_at_top,_rgba(255,56,92,0.12),_transparent_28%),linear-gradient(180deg,_#161114,_#0c0a0d)] p-4">
					<ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={320}>
						<ComposedChart data={overview.history.points} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
							<CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" vertical={false} />
							<XAxis
								dataKey="timestamp"
								tickFormatter={formatTimestamp}
								minTickGap={40}
								stroke="rgba(255,255,255,0.55)"
								tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
							/>
							<YAxis
								domain={[0, 100]}
								tickFormatter={(value) => `${value}%`}
								stroke="rgba(255,255,255,0.55)"
								tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
							/>
							<Tooltip content={<TelemetryTooltip />} />
							<Legend wrapperStyle={{ color: "#fff", fontSize: 12 }} />
							<Area type="monotone" dataKey="ramPercent" name="RAM" stroke="#f6c8d2" fill="rgba(255,201,213,0.28)" />
							<Area type="monotone" dataKey="diskPercent" name="Disk" stroke="#c9d4ff" fill="rgba(177,196,255,0.16)" />
							{overview.history.supported ? (
								<Area type="monotone" dataKey="vramPercent" name="VRAM" stroke="#f7d981" fill="rgba(247,217,129,0.14)" />
							) : null}
							<Line type="monotone" dataKey="cpuPercent" name="CPU" stroke="#ff6b8b" strokeWidth={3} dot={false} />
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			</div>
			<div className="grid gap-3 border-t border-[var(--border-soft)] px-4 py-4 md:grid-cols-4">
				<ChartFact label="cpu" value={formatPercent(overview.host.cpu.percent)} tone="danger" />
				<ChartFact label="ram" value={formatPercent(overview.host.ram.percent)} tone="accent" />
				<ChartFact label="disk" value={formatPercent(overview.host.disk.percent)} tone="neutral" />
				<ChartFact
					label="vram"
					value={overview.host.vram.supported ? formatPercent(overview.host.vram.percent) : "offline"}
					tone="warning"
				/>
			</div>
		</AppPanel>
	);
}

function ChartFact({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone: "danger" | "accent" | "neutral" | "warning";
}) {
	return (
		<div className={cx("rounded-[20px] border px-4 py-3", factTone(tone))}>
			<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
				{label}
			</p>
			<p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{value}</p>
		</div>
	);
}

function TelemetryTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: TooltipEntry[];
	label?: string | number;
}) {
	if (!active || !payload?.length) {
		return null;
	}
	return (
		<div className="rounded-[18px] border border-white/10 bg-[#140f12]/95 p-3 shadow-[var(--shadow-card)]">
			<p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/70">
				{formatTimestamp(String(label ?? ""))}
			</p>
			<div className="space-y-1 text-sm">
				{payload.map((entry, index) => (
					<p key={`${entry.name ?? "metric"}-${index}`} style={{ color: entry.color }}>
						{entry.name}: {formatPercent(typeof entry.value === "number" ? entry.value : null)}
					</p>
				))}
			</div>
		</div>
	);
}

function factTone(tone: "danger" | "accent" | "neutral" | "warning") {
	if (tone === "danger") {
		return "border-[var(--danger-quiet)] bg-[var(--danger-quiet)]/35";
	}
	if (tone === "accent") {
		return "border-[var(--accent-quiet)] bg-[var(--accent-quiet)]/35";
	}
	if (tone === "warning") {
		return "border-[var(--warning-quiet)] bg-[var(--warning-quiet)]/35";
	}
	return "border-[var(--border-soft)] bg-white/75";
}
