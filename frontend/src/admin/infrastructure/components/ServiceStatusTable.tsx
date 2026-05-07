import { Play, RotateCcw, SquareTerminal, StopCircle } from "lucide-react";
import { AppBadge, AppButton, AppPanel, AppSectionTitle, cx } from "../../../app/components";
import { countHealthyServices, countProblemServices } from "../dashboardSummary";
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

export function ServiceStatusTable({
	services,
	selectedService,
	busyService,
	onSelect,
	onAction,
}: Props) {
	return (
		<AppPanel className="rounded-[30px] border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,249,251,0.95))] p-0">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 pb-5 pt-6">
				<div>
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						service control
					</p>
					<AppSectionTitle className="mt-2 text-[1.55rem]">Managed compose services</AppSectionTitle>
					<p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
						Select a row to drive logs and terminal. Actions run against managed service allowlist only.
					</p>
				</div>
				<div className="grid min-w-[240px] gap-3 sm:grid-cols-3">
					<FactChip label="healthy" value={`${countHealthyServices(services)}`} />
					<FactChip label="issues" value={`${countProblemServices(services)}`} tone="danger" />
					<FactChip label="selected" value={selectedService ?? "none"} />
				</div>
			</div>
			<div className="overflow-x-auto px-4 pb-4 pt-3">
				<div className="min-w-[1080px] space-y-3">
					<div className="grid grid-cols-[1.4fr_1fr_0.75fr_0.9fr_0.85fr_1.3fr] gap-3 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						<span>service</span>
						<span>state</span>
						<span>uptime</span>
						<span>cpu</span>
						<span>memory</span>
						<span>actions</span>
					</div>
					{services.map((service) => {
						const active = service.name === selectedService;
						const busy = busyService === service.name;
						return (
							<div
								key={service.name}
								role="button"
								tabIndex={0}
								className={cx(
									"grid grid-cols-[1.4fr_1fr_0.75fr_0.9fr_0.85fr_1.3fr] gap-3 rounded-[24px] border px-3 py-3 text-left transition",
									active
										? "border-[var(--accent-primary)]/35 bg-[linear-gradient(90deg,_rgba(255,56,92,0.09),_rgba(255,255,255,0.92))] shadow-[var(--shadow-card)]"
										: "border-[var(--border-soft)] bg-white/85 hover:bg-[var(--surface-muted)]/45",
								)}
								onClick={() => onSelect(service.name)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onSelect(service.name);
									}
								}}
							>
								<div className="flex items-start gap-3">
									<span className={cx("mt-1.5 size-2.5 rounded-full", dotTone(service.status))} />
									<div>
										<p className="font-semibold text-[var(--text-primary)]">{service.name}</p>
										<p className="mt-1 text-xs text-[var(--text-secondary)]">
											{service.containerName ?? "container missing"}
										</p>
										<p className="mt-2 text-xs text-[var(--text-secondary)]">
											{service.ports.length ? service.ports.join(", ") : "no published ports"}
										</p>
									</div>
								</div>
								<div className="flex flex-wrap content-start gap-2">
									<AppBadge tone={toneForServiceStatus(service.status)}>{service.status}</AppBadge>
									<AppBadge>{labelForServiceHealth(service.health)}</AppBadge>
									{service.terminalEnabled ? (
										<AppBadge tone="success">
											<SquareTerminal size={12} />
											shell
										</AppBadge>
									) : null}
								</div>
								<p className="self-center text-sm font-medium text-[var(--text-primary)]">
									{service.uptime ?? "n/a"}
								</p>
								<p className="self-center text-sm font-medium text-[var(--text-primary)]">
									{formatPercent(service.cpuPercent)}
								</p>
								<p className="self-center text-sm font-medium text-[var(--text-primary)]">
									{formatBytes(service.memoryBytes)}
								</p>
								<div className="flex flex-wrap items-center gap-2">
									<AppButton
										type="button"
										variant="secondary"
										disabled={busy}
										onClick={(event) => {
											event.stopPropagation();
											onAction(service.name, "START");
										}}
									>
										<Play size={14} />
										Start
									</AppButton>
									<AppButton
										type="button"
										variant="ghost"
										disabled={busy}
										onClick={(event) => {
											event.stopPropagation();
											onAction(service.name, "STOP");
										}}
									>
										<StopCircle size={14} />
										Stop
									</AppButton>
									<AppButton
										type="button"
										disabled={busy}
										onClick={(event) => {
											event.stopPropagation();
											onAction(service.name, "RESTART");
										}}
									>
										<RotateCcw size={14} />
										Restart
									</AppButton>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</AppPanel>
	);
}

function FactChip({
	label,
	value,
	tone = "neutral",
}: {
	label: string;
	value: string;
	tone?: "neutral" | "danger";
}) {
	return (
		<div className={cx("rounded-[20px] border px-4 py-3", tone === "danger" ? "border-[var(--danger-quiet)] bg-[var(--danger-quiet)]/35" : "border-[var(--border-soft)] bg-white/80")}>
			<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
				{label}
			</p>
			<p className="mt-2 truncate text-base font-semibold text-[var(--text-primary)]">{value}</p>
		</div>
	);
}

function dotTone(status: string) {
	if (status === "running") {
		return "bg-emerald-500";
	}
	if (status === "paused" || status === "restarting") {
		return "bg-amber-500";
	}
	if (status === "exited" || status === "dead" || status === "missing") {
		return "bg-rose-500";
	}
	return "bg-slate-400";
}
