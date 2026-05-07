import { useState } from "react";
import {
	Filter,
	Play,
	RefreshCw,
	RotateCcw,
	Search,
	StopCircle,
} from "lucide-react";
import { AppBadge, AppButton, cx } from "../../../app/components";
import { formatBytes, formatPercent } from "../formatters";
import { labelForServiceHealth, toneForServiceStatus } from "../status";
import type { ServiceStatusDto } from "../types";

type Props = {
	services: ServiceStatusDto[];
	selectedService: string | null;
	busyService: string | null;
	onSelect: (serviceName: string) => void;
	onAction: (serviceName: string, action: "START" | "STOP" | "RESTART") => void;
};

type SortKey = "name" | "status" | "uptime" | "cpuPercent" | "memoryBytes";
type SortDir = "asc" | "desc";

export function ServicesView({
	services,
	selectedService,
	busyService,
	onSelect,
	onAction,
}: Props) {
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [healthFilter, setHealthFilter] = useState("all");
	const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
		key: "name",
		dir: "asc",
	});

	const toggleSort = (key: SortKey) =>
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
				: { key, dir: "asc" },
		);

	const filtered = services
		.filter((s) => {
			if (statusFilter !== "all" && s.status !== statusFilter) return false;
			if (healthFilter !== "all") {
				if (healthFilter === "healthy" && s.health !== "healthy") return false;
				if (healthFilter === "degraded" && s.health !== "degraded") return false;
				if (healthFilter === "unknown" && s.health != null) return false;
			}
			if (query) {
				const q = query.toLowerCase();
				if (
					!s.name.toLowerCase().includes(q) &&
					!(s.containerName ?? "").toLowerCase().includes(q)
				)
					return false;
			}
			return true;
		})
		.sort((a, b) => {
			const dir = sort.dir === "asc" ? 1 : -1;
			const va = a[sort.key];
			const vb = b[sort.key];
			if (va == null && vb == null) return 0;
			if (va == null) return 1;
			if (vb == null) return -1;
			if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
			return String(va).localeCompare(String(vb)) * dir;
		});

	const counts = {
		all: services.length,
		running: services.filter((s) => s.status === "running").length,
		stopped: services.filter((s) => s.status === "exited" || s.status === "dead").length,
		restarting: services.filter((s) => s.status === "restarting").length,
	};

	const activeFilters =
		(query ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (healthFilter !== "all" ? 1 : 0);

	const clearFilters = () => {
		setQuery("");
		setStatusFilter("all");
		setHealthFilter("all");
	};

	return (
		<div className="space-y-5">
			{/* Header */}
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
						Service control
					</p>
					<h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
						Managed services
					</h1>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">
						{filtered.length} of {services.length} services &middot; click a row for
						details, logs, and shell.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<AppButton variant="secondary" className="gap-2 px-3 py-2 text-xs">
						<RefreshCw size={13} /> Sync
					</AppButton>
				</div>
			</div>

			{/* Main card */}
			<div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
				{/* Filter toolbar */}
				<div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3">
					<label className="flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-1.5">
						<Search size={14} className="text-[var(--text-muted)]" />
						<input
							type="text"
							placeholder="Filter by name or container..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="w-56 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
						/>
					</label>
					<SegmentedControl
						options={[
							{ key: "all", label: `All ${counts.all}` },
							{ key: "running", label: `Running ${counts.running}` },
							{ key: "stopped", label: `Stopped ${counts.stopped}` },
							{ key: "restarting", label: `Restarting ${counts.restarting}` },
						]}
						value={statusFilter}
						onChange={setStatusFilter}
					/>
					<select
						className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
						value={healthFilter}
						onChange={(e) => setHealthFilter(e.target.value)}
					>
						<option value="all">All health</option>
						<option value="healthy">Healthy</option>
						<option value="degraded">Degraded</option>
						<option value="unknown">Unknown</option>
					</select>
					<div className="flex-1" />
					<span className="flex items-center gap-1.5 text-[0.68rem] text-[var(--text-secondary)]">
						<Filter size={11} />
						{activeFilters} active filter(s)
					</span>
					{activeFilters > 0 && (
						<button
							className="text-[0.68rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							onClick={clearFilters}
						>
							Clear
						</button>
					)}
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full min-w-[960px] text-left text-xs">
						<thead>
							<tr className="border-b border-[var(--border-soft)] bg-[var(--surface-primary)]">
								<SortTh label="Service" sortKey="name" sort={sort} onSort={toggleSort} />
								<th className="px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
									State
								</th>
								<th className="px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
									Health
								</th>
								<SortTh label="Uptime" sortKey="uptime" sort={sort} onSort={toggleSort} />
								<SortTh label="CPU" sortKey="cpuPercent" sort={sort} onSort={toggleSort} />
								<SortTh label="Memory" sortKey="memoryBytes" sort={sort} onSort={toggleSort} />
								<th className="px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
									Ports
								</th>
								<th className="px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((s) => {
								const active = s.name === selectedService;
								const busy = s.name === busyService;
								return (
									<tr
										key={s.name}
										className={cx(
											"cursor-pointer border-b border-[var(--border-soft)] transition",
											active
												? "bg-[var(--accent-quiet)]"
												: "hover:bg-[var(--surface-muted)]",
										)}
										onClick={() => onSelect(s.name)}
									>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2.5">
												<span
													className={cx(
														"size-2 rounded-full",
														s.status === "running"
															? "bg-emerald-500"
															: s.status === "exited" || s.status === "dead"
																? "bg-rose-500"
																: "bg-amber-500",
													)}
												/>
												<div>
													<p className="font-medium text-[var(--text-primary)]">
														{s.name}
													</p>
													<p className="mt-0.5 text-[0.65rem] text-[var(--text-muted)]">
														{s.containerName ?? "container missing"}
													</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<AppBadge
												tone={toneForServiceStatus(s.status)}
												className="px-2 py-0.5 text-[0.6rem]"
											>
												{s.status}
											</AppBadge>
										</td>
										<td className="px-4 py-3">
											<span className="text-[var(--text-secondary)]">
												{labelForServiceHealth(s.health)}
											</span>
										</td>
										<td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
											{s.uptime ?? "n/a"}
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--surface-muted)]">
													<div
														className="h-full rounded-full"
														style={{
															width: `${Math.min(100, (s.cpuPercent ?? 0) * 4)}%`,
															background:
																(s.cpuPercent ?? 0) > 10
																	? "var(--warning-text)"
																	: "var(--accent-primary)",
														}}
													/>
												</div>
												<span className="font-mono text-[var(--text-secondary)]">
													{formatPercent(s.cpuPercent)}
												</span>
											</div>
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--surface-muted)]">
													<div
														className="h-full rounded-full bg-[var(--accent-primary)]"
														style={{
															width: `${Math.min(100, ((s.memoryBytes ?? 0) / (512 * 1024 * 1024)) * 100)}%`,
														}}
													/>
												</div>
												<span className="font-mono text-[var(--text-secondary)]">
													{formatBytes(s.memoryBytes)}
												</span>
											</div>
										</td>
										<td className="px-4 py-3 font-mono text-[0.65rem] text-[var(--text-muted)]">
											{s.ports.length > 0 ? s.ports.join(", ") : "—"}
										</td>
										<td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center gap-1.5">
												{s.status !== "running" ? (
													<ActionBtn
														icon={<Play size={12} />}
														label="Start"
														disabled={busy}
														onClick={() => onAction(s.name, "START")}
													/>
												) : (
													<ActionBtn
														icon={<StopCircle size={12} />}
														label="Stop"
														disabled={busy}
														onClick={() => onAction(s.name, "STOP")}
													/>
												)}
												<ActionBtn
													icon={<RotateCcw size={12} />}
													label="Restart"
													disabled={busy}
													danger
													onClick={() => onAction(s.name, "RESTART")}
												/>
											</div>
										</td>
									</tr>
								);
							})}
							{filtered.length === 0 && (
								<tr>
									<td
										colSpan={8}
										className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
									>
										No services match your filters.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

function ActionBtn({
	icon,
	label,
	disabled,
	danger,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	disabled?: boolean;
	danger?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			className={cx(
				"inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.65rem] font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
				danger
					? "border-[var(--danger-quiet)] text-[var(--danger-text)] hover:bg-[var(--danger-quiet)]"
					: "border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
			)}
			disabled={disabled}
			onClick={onClick}
		>
			{icon} {label}
		</button>
	);
}

function SortTh({
	label,
	sortKey,
	sort,
	onSort,
}: {
	label: string;
	sortKey: SortKey;
	sort: { key: SortKey; dir: SortDir };
	onSort: (key: SortKey) => void;
}) {
	const active = sort.key === sortKey;
	return (
		<th
			className="cursor-pointer select-none px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
			onClick={() => onSort(sortKey)}
		>
			{label}
			{active && (
				<span className="ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>
			)}
		</th>
	);
}

function SegmentedControl({
	options,
	value,
	onChange,
}: {
	options: Array<{ key: string; label: string }>;
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="inline-flex gap-0.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] p-0.5">
			{options.map((opt) => (
				<button
					key={opt.key}
					className={cx(
						"rounded-md px-2.5 py-1 text-[0.68rem] font-medium transition",
						value === opt.key
							? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
							: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
					)}
					onClick={() => onChange(opt.key)}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}
