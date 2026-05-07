import { AlertTriangle, CheckCircle2, TerminalSquare, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { AppBadge, AppPanel, AppSectionTitle, cx } from "../../../app/components";
import {
	buildDashboardAlerts,
	countShellReadyServices,
} from "../dashboardSummary";
import type { InfrastructureOverviewDto } from "../types";

type Props = {
	overview: InfrastructureOverviewDto;
	streamConnected: boolean;
	selectedService: string | null;
};

export function InfrastructureAlertRail({
	overview,
	streamConnected,
	selectedService,
}: Props) {
	const alerts = buildDashboardAlerts(overview, streamConnected, selectedService);
	return (
		<AppPanel className="rounded-[30px] border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(249,246,244,0.94))]">
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						activity rail
					</p>
					<AppSectionTitle className="mt-2 text-[1.45rem]">Operational signals</AppSectionTitle>
				</div>
				<AppBadge tone={alerts[0]?.tone === "success" ? "success" : "warning"}>
					{alerts.length} item{alerts.length === 1 ? "" : "s"}
				</AppBadge>
			</div>
			<div className="mt-5 space-y-3">
				{alerts.map((alert) => (
					<div
						key={alert.id}
						className={cx(
							"rounded-[22px] border px-4 py-4",
							alert.tone === "danger" && "border-[var(--danger-quiet)] bg-[var(--danger-quiet)]/50",
							alert.tone === "warning" && "border-[var(--warning-quiet)] bg-[var(--warning-quiet)]/45",
							alert.tone === "accent" && "border-[var(--accent-quiet)] bg-[var(--accent-quiet)]/55",
							alert.tone === "success" && "border-[var(--success-quiet)] bg-[var(--success-quiet)]/45",
						)}
					>
						<div className="flex items-start gap-3">
							<div className="mt-0.5">{iconForAlert(alert.tone)}</div>
							<div>
								<p className="font-semibold text-[var(--text-primary)]">{alert.title}</p>
								<p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{alert.detail}</p>
							</div>
						</div>
					</div>
				))}
			</div>
			<div className="mt-5 grid gap-3 sm:grid-cols-2">
				<MiniFact
					label="shell-ready"
					value={`${countShellReadyServices(overview.services)}/${overview.services.length}`}
					icon={<TerminalSquare size={14} />}
				/>
				<MiniFact
					label="transport"
					value={streamConnected ? "websocket live" : "snapshot mode"}
					icon={streamConnected ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}
				/>
			</div>
		</AppPanel>
	);
}

function MiniFact({
	label,
	value,
	icon,
}: {
	label: string;
	value: string;
	icon: ReactNode;
}) {
	return (
		<div className="rounded-[20px] border border-[var(--border-soft)] bg-white/80 px-4 py-3">
			<p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
				{icon}
				{label}
			</p>
			<p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
		</div>
	);
}

function iconForAlert(tone: "danger" | "warning" | "accent" | "success") {
	if (tone === "success") {
		return <CheckCircle2 size={18} className="text-[var(--success-text)]" />;
	}
	if (tone === "accent") {
		return <TerminalSquare size={18} className="text-[var(--accent-primary-strong)]" />;
	}
	return <AlertTriangle size={18} className={tone === "danger" ? "text-[var(--danger-text)]" : "text-[var(--warning-text)]"} />;
}
