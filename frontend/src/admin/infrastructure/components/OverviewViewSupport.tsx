// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- KPI sparklines are part of the overview's first paint and share the same chart bundle.
import {
	Line as RechartsLine,
	LineChart as RechartsLineChart,
	ResponsiveContainer,
} from "recharts";
import { cx } from "../../../app/components";
import { formatBytes } from "../formatters";
import type { InfrastructureOverviewDto } from "../types";

export function KpiCard({
	label,
	value,
	sub,
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
			<p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{label}</p>
			<p className="mt-1.5 font-mono text-xl font-medium tracking-tight text-[var(--text-primary)]">{value}</p>
			<p className="mt-1 text-[0.68rem] text-[var(--text-secondary)]">{sub}</p>
			{data.length > 0 && <Sparkline data={data} color={color} />}
		</div>
	);
}

function Sparkline({ data, color }: { data: Array<{ v: number }>; color: string }) {
	return (
		<div className="absolute bottom-3 right-3 h-7 w-20 opacity-90">
			<ResponsiveContainer width="100%" height="100%">
				<RechartsLineChart data={data}>
					<RechartsLine dataKey="v" type="monotone" dot={false} stroke={color} strokeWidth={1.5} />
				</RechartsLineChart>
			</ResponsiveContainer>
		</div>
	);
}

export function ServiceHealthSegment({ service }: { service: InfrastructureOverviewDto["services"][number] }) {
	const ok = service.status === "running" && (service.health == null || service.health === "healthy");
	const degraded = service.status === "running";
	return (
		<div
			className="flex-1"
			style={{ background: ok ? "var(--success-text)" : degraded ? "#d97706" : "var(--danger-text)" }}
			title={`${service.name} - ${service.status}/${service.health ?? "unknown"}`}
		/>
	);
}

export function CountCell({ label, value, color }: { label: string; value: number; color: string }) {
	return (
		<div className="bg-[var(--surface-primary)] px-3.5 py-2.5">
			<p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">{label}</p>
			<p className="mt-1 font-mono text-base font-medium" style={{ color }}>{value}</p>
		</div>
	);
}

export function MemoryBar({ service }: { service: { name: string; memoryBytes: number | null; memoryLimitBytes: number | null } }) {
	const bytes = service.memoryBytes ?? 0;
	const limit = service.memoryLimitBytes ?? 512 * 1024 * 1024;
	const pct = Math.min(100, (bytes / limit) * 100);
	return (
		<div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 py-1.5">
			<p className="truncate text-xs text-[var(--text-primary)]">{service.name}</p>
			<div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
				<div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${pct}%` }} />
			</div>
			<p className="text-right font-mono text-[0.68rem] text-[var(--text-secondary)]">{formatBytes(bytes)}</p>
		</div>
	);
}

export function SegmentedControl({
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
						value === opt ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
					)}
					onClick={() => onChange(opt)}
				>
					{opt}
				</button>
			))}
		</div>
	);
}

export function alertTone(tone: "danger" | "warning" | "accent" | "success") {
	if (tone === "danger") return "bg-[var(--danger-quiet)] text-[var(--danger-text)]";
	if (tone === "warning") return "bg-[var(--warning-quiet)] text-[var(--warning-text)]";
	if (tone === "accent") return "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]";
	return "bg-[var(--success-quiet)] text-[var(--success-text)]";
}
